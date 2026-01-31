import { Router, Request, Response } from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import {
  checkFtsIntegrity,
  rebuildAllFtsIndexes,
  optimizeFtsIndexes,
  rebuildDepartmentsFts,
  rebuildPeopleFts,
  rebuildCustomFieldsFts,
} from '../services/fts-maintenance.service.js';
import db from '../db.js';
import logger from '../utils/logger.js';

const router = Router();

// ============================================================================
// FTS Health Check (Read-only, available to all authenticated users)
// ============================================================================

/**
 * GET /api/fts-maintenance/health
 * Check FTS index integrity
 */
router.get('/health', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const health = checkFtsIntegrity();
    res.json(health);
  } catch (err) {
    console.error('Error checking FTS health:', err);
    res.status(500).json({
      error: 'Failed to check FTS health',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ============================================================================
// FTS Maintenance Operations (Superuser only)
// ============================================================================

/**
 * POST /api/fts-maintenance/rebuild/all
 * Rebuild all FTS indexes (superuser only)
 */
router.post(
  '/rebuild/all',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Check if user is superuser
      if (req.user?.role !== 'superuser') {
        res.status(403).json({ error: 'Forbidden: Superuser access required' });
        return;
      }

      const result = rebuildAllFtsIndexes();
      res.json({
        message: 'FTS indexes rebuilt successfully',
        health: result,
      });
    } catch (err) {
      console.error('Error rebuilding FTS indexes:', err);
      res.status(500).json({
        error: 'Failed to rebuild FTS indexes',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

/**
 * POST /api/fts-maintenance/rebuild/departments
 * Rebuild departments_fts index (superuser only)
 */
router.post(
  '/rebuild/departments',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'superuser') {
        res.status(403).json({ error: 'Forbidden: Superuser access required' });
        return;
      }

      rebuildDepartmentsFts();
      const health = checkFtsIntegrity();
      res.json({
        message: 'departments_fts rebuilt successfully',
        health,
      });
    } catch (err) {
      console.error('Error rebuilding departments_fts:', err);
      res.status(500).json({
        error: 'Failed to rebuild departments_fts',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

/**
 * POST /api/fts-maintenance/rebuild/people
 * Rebuild people_fts index (superuser only)
 */
router.post(
  '/rebuild/people',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'superuser') {
        res.status(403).json({ error: 'Forbidden: Superuser access required' });
        return;
      }

      rebuildPeopleFts();
      const health = checkFtsIntegrity();
      res.json({
        message: 'people_fts rebuilt successfully',
        health,
      });
    } catch (err) {
      console.error('Error rebuilding people_fts:', err);
      res.status(500).json({
        error: 'Failed to rebuild people_fts',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

/**
 * POST /api/fts-maintenance/rebuild/custom-fields
 * Rebuild custom_fields_fts index (superuser only)
 */
router.post(
  '/rebuild/custom-fields',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'superuser') {
        res.status(403).json({ error: 'Forbidden: Superuser access required' });
        return;
      }

      rebuildCustomFieldsFts();
      const health = checkFtsIntegrity();
      res.json({
        message: 'custom_fields_fts rebuilt successfully',
        health,
      });
    } catch (err) {
      console.error('Error rebuilding custom_fields_fts:', err);
      res.status(500).json({
        error: 'Failed to rebuild custom_fields_fts',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
);

/**
 * POST /api/fts-maintenance/optimize
 * Optimize FTS indexes (superuser only)
 */
router.post('/optimize', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'superuser') {
      res.status(403).json({ error: 'Forbidden: Superuser access required' });
      return;
    }

    optimizeFtsIndexes();
    res.json({ message: 'FTS indexes optimized successfully' });
  } catch (err) {
    console.error('Error optimizing FTS indexes:', err);
    res.status(500).json({
      error: 'Failed to optimize FTS indexes',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
