import express from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import {
  createBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats,
} from '../services/backup.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/admin/backups
 * List all available backups
 * Requires: Superuser
 */
router.get('/admin/backups', authenticateToken, requireSuperuser, (req, res) => {
  try {
    const backups = listBackups();
    const stats = getBackupStats();

    res.json({
      backups,
      stats,
    });
  } catch (error) {
    logger.error('Failed to list backups', { error: error.message });
    res.status(500).json({ message: 'Failed to list backups' });
  }
});

/**
 * POST /api/admin/backups
 * Create a new backup
 * Requires: Superuser
 */
router.post('/admin/backups', authenticateToken, requireSuperuser, async (req, res) => {
  try {
    logger.info('Manual backup triggered', {
      userId: req.user.id,
      userEmail: req.user.email,
    });

    const result = await createBackup();

    if (result.success) {
      // Optionally cleanup old backups
      const cleanup = cleanupOldBackups();

      res.json({
        message: 'Backup created successfully',
        backup: {
          path: result.path,
          sizeMB: result.sizeMB,
          timestamp: result.timestamp,
        },
        cleanup: {
          kept: cleanup.kept,
          deleted: cleanup.deleted,
        },
      });
    } else {
      res.status(500).json({ message: result.error });
    }
  } catch (error) {
    logger.error('Failed to create backup', { error: error.message });
    res.status(500).json({ message: 'Failed to create backup' });
  }
});

/**
 * DELETE /api/admin/backups/cleanup
 * Clean up old backups (keep last N)
 * Requires: Superuser
 */
router.delete('/admin/backups/cleanup', authenticateToken, requireSuperuser, (req, res) => {
  try {
    const keepCount = parseInt(req.query.keep || '7', 10);

    if (keepCount < 1 || keepCount > 30) {
      return res.status(400).json({ message: 'Keep count must be between 1 and 30' });
    }

    logger.info('Manual backup cleanup triggered', {
      userId: req.user.id,
      keepCount,
    });

    const result = cleanupOldBackups(keepCount);

    res.json({
      message: 'Cleanup completed',
      kept: result.kept,
      deleted: result.deleted,
      deletedFiles: result.deletedFiles,
    });
  } catch (error) {
    logger.error('Failed to cleanup backups', { error: error.message });
    res.status(500).json({ message: 'Failed to cleanup backups' });
  }
});

/**
 * GET /api/admin/backups/stats
 * Get backup statistics
 * Requires: Superuser
 */
router.get('/admin/backups/stats', authenticateToken, requireSuperuser, (req, res) => {
  try {
    const stats = getBackupStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get backup stats', { error: error.message });
    res.status(500).json({ message: 'Failed to get backup stats' });
  }
});

export default router;
