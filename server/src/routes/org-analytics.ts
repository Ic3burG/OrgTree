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

import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import type { AuthRequest } from '../types/index.js';
import {
  getOrgAnalyticsOverview,
  getOrgGrowthTrends,
  getOrgStructuralHealth,
  getOrgActivityMetrics,
  getOrgSearchAnalytics,
} from '../services/org-analytics.service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper for permission check
const requireAdmin = async (orgId: string, userId: string) => {
  await requireOrgPermission(orgId, userId, 'admin');
};

// GET /api/organizations/:id/analytics/overview
router.get(
  '/organizations/:id/analytics/overview',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      await requireAdmin(orgId, req.user!.id);

      const overview = getOrgAnalyticsOverview(orgId);
      res.json(overview);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id/analytics/growth
router.get(
  '/organizations/:id/analytics/growth',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      const period = (req.query.period as '7d' | '30d' | '90d' | '1y') || '30d';

      await requireAdmin(orgId, req.user!.id);

      const trends = getOrgGrowthTrends(orgId, period);
      res.json(trends);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id/analytics/health
router.get(
  '/organizations/:id/analytics/health',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      await requireAdmin(orgId, req.user!.id);

      const health = getOrgStructuralHealth(orgId);
      res.json(health);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id/analytics/activity
router.get(
  '/organizations/:id/analytics/activity',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      const period = (req.query.period as '7d' | '30d' | '90d') || '30d';

      await requireAdmin(orgId, req.user!.id);

      const activity = getOrgActivityMetrics(orgId, period);
      res.json(activity);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id/analytics/search
router.get(
  '/organizations/:id/analytics/search',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      await requireAdmin(orgId, req.user!.id);

      // Cast '30d' as it's the only supported period for now in service
      const searchStats = getOrgSearchAnalytics(orgId, '30d');
      res.json(searchStats);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
