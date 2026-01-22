import express, { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import { createAuditLog } from '../services/audit.service.js';
import db from '../db.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

// POST /api/organizations/:orgId/import
router.post(
  '/organizations/:orgId/import',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { data } = req.body; // Array of parsed CSV rows

      if (!data || !Array.isArray(data)) {
        res.status(400).json({ message: 'Invalid data format' });
        return;
      }

      // Security: Limit import size to prevent DoS
      const MAX_IMPORT_SIZE = 10000;
      if (data.length > MAX_IMPORT_SIZE) {
        res.status(400).json({
          message: `Import size exceeds maximum limit of ${MAX_IMPORT_SIZE} items`,
        });
        return;
      }

      // Security: Verify user has admin permission (owner or admin member)
      requireOrgPermission(orgId!, req.user!.id, 'admin');

      // Process import within a transaction
      const pathToDeptId = new Map<string, string>();
      let departmentsCreated = 0;
      let departmentsReused = 0;
      let peopleCreated = 0;
      let peopleSkipped = 0;

      // Sort rows so departments come before their children
      const sortedData = [...data].sort((a: { path: string }, b: { path: string }) => {
        const depthA = (a.path.match(/\//g) || []).length;
        const depthB = (b.path.match(/\//g) || []).length;
        return depthA - depthB;
      });

      // Fetch custom field definitions for this organization
      const fieldDefinitions = db
        .prepare(
          'SELECT id, field_key, entity_type FROM custom_field_definitions WHERE organization_id = ? AND deleted_at IS NULL'
        )
        .all(orgId) as { id: string; field_key: string; entity_type: string }[];

      const personFields = fieldDefinitions.filter(f => f.entity_type === 'person');
      const deptFields = fieldDefinitions.filter(f => f.entity_type === 'department');

      // Prepare statements
      const insertDept = db.prepare(`
      INSERT INTO departments (id, organization_id, parent_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

      const insertPerson = db.prepare(`
      INSERT INTO people (id, department_id, name, title, email, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

      const insertFieldValue = db.prepare(`
        INSERT INTO custom_field_values (id, field_definition_id, entity_type, entity_id, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const updateFts = db.prepare(`
        INSERT OR REPLACE INTO custom_fields_fts (entity_id, entity_type, field_values)
        VALUES (?, ?, ?)
      `);

      // Check for existing person by email within the SAME organization
      // We join departments to check organization_id
      // Use LOWER() for case-insensitive comparison and TRIM() to handle whitespace
      const checkPersonEmail = db.prepare(`
        SELECT p.id
        FROM people p
        JOIN departments d ON p.department_id = d.id
        WHERE d.organization_id = ?
        AND LOWER(TRIM(p.email)) = LOWER(TRIM(?))
        AND p.deleted_at IS NULL
      `);

      // Fallback check: Name + Department (if email is empty)
      // Use LOWER() and TRIM() for case-insensitive, whitespace-tolerant comparison
      const checkPersonNameInDept = db.prepare(`
        SELECT id FROM people
        WHERE department_id = ?
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        AND deleted_at IS NULL
      `);

      // Check for existing department by name and parent
      // Use LOWER() and TRIM() for case-insensitive, whitespace-tolerant comparison
      const checkDepartment = db.prepare(`
        SELECT id FROM departments
        WHERE organization_id = ?
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
        AND deleted_at IS NULL
      `);

      // Helper to generate cryptographically secure ID
      const generateId = () => randomUUID();

      try {
        // Start transaction
        db.prepare('BEGIN TRANSACTION').run();

        for (const row of sortedData) {
          const type = row.type.toLowerCase();

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

            // Process custom fields for department
            const ftsContent: string[] = [];
            for (const field of deptFields) {
              const val = row[field.field_key];
              if (val !== undefined && val !== null && val !== '') {
                insertFieldValue.run(generateId(), field.id, 'department', deptId, val);
                ftsContent.push(String(val));
              }
            }
            if (ftsContent.length > 0) {
              updateFts.run(deptId, 'department', ftsContent.join(' '));
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

              // Process custom fields for person
              const ftsContent: string[] = [];
              for (const field of personFields) {
                const val = row[field.field_key];
                if (val !== undefined && val !== null && val !== '') {
                  insertFieldValue.run(generateId(), field.id, 'person', personId, val);
                  ftsContent.push(String(val));
                }
              }
              if (ftsContent.length > 0) {
                updateFts.run(personId, 'person', ftsContent.join(' '));
              }
            }
          }
        }

        // Commit transaction
        db.prepare('COMMIT').run();

        // Log the import action in audit trail
        createAuditLog(
          orgId!,
          {
            id: req.user!.id,
            name: req.user!.name,
            email: req.user!.email,
          },
          'import',
          'data_import',
          null,
          {
            departmentsCreated,
            departmentsReused,
            peopleCreated,
            peopleSkipped,
            duplicatesFound: peopleSkipped > 0 || departmentsReused > 0,
            totalRows: data.length,
            timestamp: new Date().toISOString(),
          }
        );

        res.json({
          success: true,
          departmentsCreated,
          departmentsReused,
          peopleCreated,
          peopleSkipped,
          errors: [],
        });
      } catch (err) {
        // Rollback on error
        db.prepare('ROLLBACK').run();
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
