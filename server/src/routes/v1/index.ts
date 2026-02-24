/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { validateCsrf } from '../../middleware/csrf.js';
import db from '../../db.js';

// Route imports
import authRoutes from '../auth.js';
import organizationRoutes from '../organizations.js';
import departmentRoutes from '../departments.js';
import peopleRoutes from '../people.js';
import importRoutes from '../import.js';
import publicRoutes from '../public.js';
import usersRoutes from '../users.js';
import memberRoutes from '../members.js';
import invitationRoutes from '../invitations.js';
import auditRoutes from '../audit.js';
import searchRoutes from '../search.js';
import savedSearchesRoutes from '../saved-searches.js';
import bulkRoutes from '../bulk.js';
import csrfRoutes from '../csrf.js';
import backupRoutes from '../backup.js';
import passkeyRoutes from '../passkey.js';
import totpRoutes from '../totp.js';
import customFieldsRoutes from '../custom-fields.js';
import metricsRoutes from '../metrics.js';
import analyticsRoutes from '../analytics.js';
import orgAnalyticsRoutes from '../org-analytics.js';
import gedsRoutes from '../geds.js';
import gedsImportRoutes from '../geds-import.js';
import ownershipTransfersRoutes from '../ownership-transfers.js';
import ftsMaintenanceRoutes from '../fts-maintenance.js';
import versionRoutes from '../version.js';
import orgMembershipCheckRoutes from '../org-membership-check.js';
import fixOrgOwnersRoutes from '../fix-org-owners.js';
import fixOrgOwnersSimpleRoutes from '../fix-org-owners-simple.js';

const router = express.Router();

/**
 * API v1 Routes
 * These routes are mounted at /api/v1
 */

// Add version header to all responses
router.use((_req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  next();
});

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.join(__dirname, '../../openapi.yaml');

// Health check with database connectivity test and system metrics
router.get('/health', async (_req, res) => {
  try {
    // Test database connectivity
    const dbCheck = db.prepare('SELECT 1 as ok').get() as { ok: number };

    // Get database mode for verification
    const journalMode = db.pragma('journal_mode', { simple: true }) as string;
    const busyTimeout = db.pragma('busy_timeout', { simple: true }) as number;

    // Get process and system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Security: Don't expose sensitive environment details or full paths
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: {
        seconds: Math.floor(uptime),
        human: new Date(uptime * 1000).toISOString().substr(11, 8),
      },
      database: {
        status: dbCheck.ok === 1 ? 'connected' : 'error',
        journal_mode: journalMode,
        busy_timeout_ms: busyTimeout,
      },
      process: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        },
      },
    });
  } catch (error: unknown) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: (error as Error).message,
    });
  }
});

// Serve raw OpenAPI spec
router.get('/openapi.yaml', (_req, res) => {
  res.type('text/yaml').send(fs.readFileSync(openApiPath, 'utf8'));
});
router.get('/openapi.json', (_req, res) => {
  const openApiSpec = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));
  res.json(openApiSpec);
});

// CSRF token endpoint (must be before CSRF validation middleware)
router.use('/', csrfRoutes);

// Version endpoint (no authentication required)
router.use('/', versionRoutes);

// Debug and Migration endpoints (some without CSRF required)
router.use('/', orgMembershipCheckRoutes);
router.use('/', fixOrgOwnersSimpleRoutes);
router.use('/', backupRoutes);

// Public routes (no authentication or CSRF required)
router.use('/auth', authRoutes);
router.use('/auth/passkey', passkeyRoutes);
router.use('/auth/2fa', totpRoutes);
router.use('/public', publicRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/geds', gedsRoutes);

// Protected routes (require CSRF validation for state-changing operations)
router.use(validateCsrf);

router.use('/', organizationRoutes);
router.use('/', orgAnalyticsRoutes);
router.use('/', ownershipTransfersRoutes);
router.use('/', departmentRoutes);
router.use('/', peopleRoutes);
router.use('/', importRoutes);
router.use('/', gedsImportRoutes);
router.use('/', customFieldsRoutes);
router.use('/', usersRoutes);
router.use('/', memberRoutes);
router.use('/', invitationRoutes);
router.use('/', auditRoutes);
router.use('/', searchRoutes);
router.use('/', savedSearchesRoutes);
router.use('/', bulkRoutes);
router.use('/', metricsRoutes);
router.use('/fts-maintenance', ftsMaintenanceRoutes);
router.use('/', fixOrgOwnersRoutes);

export default router;
