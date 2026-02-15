/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import {
  checkFtsIntegrity,
  rebuildAllFtsIndexes,
  optimizeFtsIndexes,
  rebuildDepartmentsFts,
  rebuildPeopleFts,
  rebuildCustomFieldsFts,
} from '../services/fts-maintenance.service.js';

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
router.post(
  '/optimize',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
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
  }
);

export default router;
