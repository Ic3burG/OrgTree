import express, { Response, NextFunction } from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import {
  createBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats,
} from '../services/backup.service.js';
import logger from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';
import db from '../db.js';

const router = express.Router();

/**
 * Authentication middleware for backup requests.
 * Supports both standard JWT authentication and a fixed API token for server-to-server automation (CI/CD).
 */
const authenticateBackupRequest = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Debug logging (remove after troubleshooting)
  logger.info('Backup authentication attempt', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    hasEnvToken: !!process.env.BACKUP_API_TOKEN,
    tokenLength: token?.length,
    envTokenLength: process.env.BACKUP_API_TOKEN?.length,
    tokensMatch: token === process.env.BACKUP_API_TOKEN,
  });

  // Check for fixed API token (if configured)
  if (token && process.env.BACKUP_API_TOKEN && token === process.env.BACKUP_API_TOKEN) {
    // Inject a system superuser for authorized backup operations
    req.user = {
      id: 'system-backup',
      email: 'system@backup.internal',
      role: 'superuser',
      name: 'Backup System Automation',
    };
    logger.info('Backup API token authenticated successfully');
    return next();
  }

  // Fallback to standard token authentication
  logger.info('Falling back to standard JWT authentication');
  return authenticateToken(req, res, next);
};

/**
 * GET /api/admin/backups
 * List all available backups
 * Requires: Superuser
 */
router.get(
  '/admin/backups',
  authenticateBackupRequest,
  requireSuperuser,
  (_req: AuthRequest, res: Response): void => {
    try {
      const backups = listBackups();
      const stats = getBackupStats();

      res.json({
        backups,
        stats,
      });
    } catch (error: unknown) {
      logger.error('Failed to list backups', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ message: 'Failed to list backups' });
    }
  }
);

/**
 * POST /api/admin/backups or /api/admin/backup
 * Create a new backup. Supports 'type' parameter in body for specialized backups.
 * Requires: Superuser
 */
const handlePostBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.body || {};

    logger.info('Backup triggered', {
      userId: req.user!.id,
      userEmail: req.user!.email,
      type: type || 'manual',
    });

    let result;
    if (type === 'pre-migration' || type === 'pre-deployment') {
      const { createPreMigrationBackup } = await import('../services/migration-backup.service.js');
      result = await createPreMigrationBackup();
    } else {
      result = await createBackup();
    }

    if (result.success) {
      // Logic for automatic cleanup
      // For pre-migration backups, we might want different retention later,
      // but for now we follow the same policy or specific ones if needed.
      const cleanup = cleanupOldBackups();

      res.json({
        message: 'Backup created successfully',
        backup: {
          path: result.path,
          sizeMB: result.sizeMB,
          timestamp: result.timestamp,
          type: type || 'manual',
        },
        cleanup: {
          kept: cleanup.kept,
          deleted: cleanup.deleted,
        },
      });
    } else {
      res.status(500).json({ message: result.error });
    }
  } catch (error: unknown) {
    logger.error('Failed to create backup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ message: 'Failed to create backup' });
  }
};

router.post('/admin/backups', authenticateBackupRequest, requireSuperuser, handlePostBackup);
router.post('/admin/backup', authenticateBackupRequest, requireSuperuser, handlePostBackup);

/**
 * DELETE /api/admin/backups/cleanup
 * Clean up old backups (keep last N)
 * Requires: Superuser
 */
router.delete(
  '/admin/backups/cleanup',
  authenticateBackupRequest,
  requireSuperuser,
  (req: AuthRequest, res: Response): void => {
    try {
      const keepCount = parseInt((req.query.keep as string) || '7', 10);

      if (keepCount < 1 || keepCount > 30) {
        res.status(400).json({ message: 'Keep count must be between 1 and 30' });
        return;
      }

      logger.info('Manual backup cleanup triggered', {
        userId: req.user!.id,
        keepCount,
      });

      const result = cleanupOldBackups(keepCount);

      res.json({
        message: 'Cleanup completed',
        kept: result.kept,
        deleted: result.deleted,
        deletedFiles: result.deletedFiles,
      });
    } catch (error: unknown) {
      logger.error('Failed to cleanup backups', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ message: 'Failed to cleanup backups' });
    }
  }
);

/**
 * GET /api/admin/backups/stats
 * Get backup statistics
 * Requires: Superuser
 */
router.get(
  '/admin/backups/stats',
  authenticateBackupRequest,
  requireSuperuser,
  (_req: AuthRequest, res: Response): void => {
    try {
      const stats = getBackupStats();
      res.json(stats);
    } catch (error: unknown) {
      logger.error('Failed to get backup stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ message: 'Failed to get backup stats' });
    }
  }
);

/**
 * POST /api/admin/rollback/last
 * Automatically rollback the last applied migration.
 * Targeted at CI/CD pipelines for automated recovery.
 * Requires: Superuser
 */
router.post(
  '/admin/rollback/last',
  authenticateBackupRequest,
  requireSuperuser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { discoverMigrations } = await import('../migrations/index.js');
      const { legacyMigrations } = await import('../migrations/legacy-migrations.js');

      const dbRows = db.prepare('SELECT id FROM _migrations ORDER BY id DESC LIMIT 1').get() as
        | { id: string }
        | undefined;

      if (!dbRows) {
        res.status(404).json({ error: 'No migrations found to rollback' });
        return;
      }

      const allMigrations = [...legacyMigrations, ...(await discoverMigrations())];
      const migration = allMigrations.find(m => m.id === dbRows.id);

      if (!migration) {
        res.status(404).json({ error: `Migration definition for ${dbRows.id} not found` });
        return;
      }

      logger.info('Auto-Rollback triggered via API', {
        migrationId: migration.id,
        user: req.user?.email,
      });

      db.transaction(() => {
        migration.down(db);
        db.prepare('DELETE FROM _migrations WHERE id = ?').run(migration.id);
      })();

      res.json({ message: `Successfully rolled back migration ${migration.id}`, id: migration.id });
    } catch (error) {
      logger.error('Rollback failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Rollback failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export default router;
