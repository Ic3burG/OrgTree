import express, { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import { createAuditLog } from '../services/audit.service.js';
import { parseGedsXml, ParsedGedsData, ParseError } from '../services/geds-parser.service.js';
import {
  downloadGedsXml,
  cleanupTempFile,
  InvalidUrlError,
  DownloadTimeoutError,
  FileSizeLimitError,
  NetworkError,
} from '../services/geds-download.service.js';
import db from '../db.js';
import logger from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

router.use(authenticateToken);

/**
 * Result for a single URL import
 */
interface GedsImportResult {
  url: string;
  status: 'success' | 'failed';
  message: string;
  stats?: {
    departments: number;
    people: number;
    departmentsCreated: number;
    departmentsReused: number;
    peopleCreated: number;
    peopleSkipped: number;
  };
  error?: string;
}

/**
 * Import data using the same logic as the existing CSV import
 * This reuses the import logic to maintain consistency
 */
function importGedsData(
  orgId: string,
  userId: string,
  data: ParsedGedsData
): {
  departmentsCreated: number;
  departmentsReused: number;
  peopleCreated: number;
  peopleSkipped: number;
} {
  const pathToDeptId = new Map<string, string>();
  let departmentsCreated = 0;
  let departmentsReused = 0;
  let peopleCreated = 0;
  let peopleSkipped = 0;

  // Combine departments and people into a single array for processing
  const allRows = [...data.departments, ...data.people];

  // Prepare statements
  const insertDept = db.prepare(`
    INSERT INTO departments (id, organization_id, parent_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertPerson = db.prepare(`
    INSERT INTO people (id, department_id, name, title, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const checkPersonEmail = db.prepare(`
    SELECT p.id
    FROM people p
    JOIN departments d ON p.department_id = d.id
    WHERE d.organization_id = ?
    AND LOWER(TRIM(p.email)) = LOWER(TRIM(?))
    AND p.deleted_at IS NULL
  `);

  const checkPersonNameInDept = db.prepare(`
    SELECT id FROM people
    WHERE department_id = ?
    AND LOWER(TRIM(name)) = LOWER(TRIM(?))
    AND deleted_at IS NULL
  `);

  const checkDepartment = db.prepare(`
    SELECT id FROM departments
    WHERE organization_id = ?
    AND LOWER(TRIM(name)) = LOWER(TRIM(?))
    AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
    AND deleted_at IS NULL
  `);

  const generateId = () => randomUUID();

  try {
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();

    for (const row of allRows) {
      const type = row.type;

      if (type === 'department') {
        // Find parent path
        const pathParts = row.path.split('/').filter(Boolean);
        const parentPath = pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : null;
        const parentId = parentPath ? pathToDeptId.get(parentPath) || null : null;

        // Check if department already exists
        const existing = checkDepartment.get(orgId, row.name, parentId, parentId) as
          | { id: string }
          | undefined;

        let deptId;
        if (existing) {
          // Department exists, reuse it
          deptId = existing.id;
          pathToDeptId.set(row.path, deptId);
          departmentsReused++;
        } else {
          // Create new department
          deptId = generateId();
          insertDept.run(deptId, orgId, parentId, row.name, row.description || null);
          pathToDeptId.set(row.path, deptId);
          departmentsCreated++;
        }
      } else if (type === 'person') {
        // Find department from path
        const pathParts = row.path.split('/').filter(Boolean);
        const deptPath = '/' + pathParts.slice(0, -1).join('/');
        const deptId = pathToDeptId.get(deptPath);

        if (deptId) {
          // DUPLICATE CHECK
          let exists = false;

          if (row.email && row.email.trim()) {
            // Check email uniqueness in organization
            const existing = checkPersonEmail.get(orgId, row.email.trim());
            if (existing) exists = true;
          } else {
            // Check name uniqueness in department (fallback)
            const existing = checkPersonNameInDept.get(deptId, row.name.trim());
            if (existing) exists = true;
          }

          if (exists) {
            peopleSkipped++;
            continue;
          }

          const personId = generateId();
          insertPerson.run(
            personId,
            deptId,
            row.name,
            row.title || null,
            row.email || null,
            row.phone || null
          );
          peopleCreated++;
        }
      }
    }

    // Commit transaction
    db.prepare('COMMIT').run();

    return {
      departmentsCreated,
      departmentsReused,
      peopleCreated,
      peopleSkipped,
    };
  } catch (err) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    throw err;
  }
}

/**
 * POST /api/organizations/:orgId/import/geds-urls
 * Import GEDS data from multiple XML URLs
 */
router.post(
  '/organizations/:orgId/import/geds-urls',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { urls } = req.body;

      // Validation
      if (!urls || !Array.isArray(urls)) {
        res.status(400).json({ message: 'Invalid request: urls must be an array' });
        return;
      }

      if (urls.length === 0) {
        res.status(400).json({ message: 'No URLs provided' });
        return;
      }

      if (urls.length > 10) {
        res.status(400).json({ message: 'Maximum 10 URLs allowed per request' });
        return;
      }

      // Security: Verify user has admin permission
      requireOrgPermission(orgId!, req.user!.id, 'admin');

      logger.info('Starting GEDS URL import', {
        orgId,
        userId: req.user!.id,
        urlCount: urls.length,
      });

      const results: GedsImportResult[] = [];
      const tempDir = os.tmpdir();

      // Process each URL sequentially
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const tempFile = path.join(tempDir, `geds-${Date.now()}-${i}.xml`);

        logger.info(`Processing GEDS URL ${i + 1}/${urls.length}`, { url });

        try {
          // Step 1: Download XML
          await downloadGedsXml(url, tempFile);
          logger.info('Downloaded GEDS XML', { url, tempFile });

          // Step 2: Read and parse XML
          const xmlContent = await fs.readFile(tempFile, 'utf-8');
          const parsed = await parseGedsXml(xmlContent);
          logger.info('Parsed GEDS XML', {
            url,
            departments: parsed.departments.length,
            people: parsed.people.length,
          });

          // Step 3: Import data
          const stats = importGedsData(orgId!, req.user!.id, parsed);
          logger.info('Imported GEDS data', { url, stats });

          // Step 4: Log audit trail
          createAuditLog(
            orgId!,
            {
              id: req.user!.id,
              name: req.user!.name,
              email: req.user!.email,
            },
            'import',
            'geds_url',
            url,
            {
              url,
              departmentsCreated: stats.departmentsCreated,
              departmentsReused: stats.departmentsReused,
              peopleCreated: stats.peopleCreated,
              peopleSkipped: stats.peopleSkipped,
              timestamp: new Date().toISOString(),
            }
          );

          // Success result
          results.push({
            url,
            status: 'success',
            message: 'Imported successfully',
            stats: {
              departments: stats.departmentsCreated + stats.departmentsReused,
              people: stats.peopleCreated,
              departmentsCreated: stats.departmentsCreated,
              departmentsReused: stats.departmentsReused,
              peopleCreated: stats.peopleCreated,
              peopleSkipped: stats.peopleSkipped,
            },
          });
        } catch (err) {
          // Handle specific error types
          let errorMessage = 'Unknown error';

          if (err instanceof InvalidUrlError) {
            errorMessage = err.message;
          } else if (err instanceof DownloadTimeoutError) {
            errorMessage = 'Download timed out';
          } else if (err instanceof FileSizeLimitError) {
            errorMessage = 'File too large';
          } else if (err instanceof NetworkError) {
            errorMessage = `Network error: ${err.message}`;
          } else if (err instanceof ParseError) {
            errorMessage = `Parse error: ${err.message}`;
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }

          logger.error('GEDS URL import failed', {
            url,
            error: errorMessage,
            errorType: err instanceof Error ? err.constructor.name : 'Unknown',
          });

          results.push({
            url,
            status: 'failed',
            message: 'Import failed',
            error: errorMessage,
          });
        } finally {
          // Always cleanup temp file
          await cleanupTempFile(tempFile);
        }
      }

      // Count successes and failures
      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.filter(r => r.status === 'failed').length;

      logger.info('GEDS URL import complete', {
        orgId,
        userId: req.user!.id,
        total: urls.length,
        success: successCount,
        failed: failureCount,
      });

      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
