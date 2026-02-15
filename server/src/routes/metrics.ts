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

// ============================================================================
// Metrics Routes
// API endpoints for the application metrics dashboard
// All endpoints require superuser role
// ============================================================================

import express, { Response, NextFunction } from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import {
  getOverviewMetrics,
  getUsageMetrics,
  getPerformanceMetrics,
  getAuditMetrics,
} from '../services/metrics.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// All metrics routes require authentication and superuser role
router.use(authenticateToken);
router.use(requireSuperuser);

/**
 * GET /api/admin/metrics/overview
 * Get summary statistics for the dashboard header
 * Returns: OverviewMetrics
 */
router.get(
  '/admin/metrics/overview',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getOverviewMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/metrics/usage
 * Get usage metrics including user growth, org trends, content volume
 * Returns: UsageMetrics
 */
router.get(
  '/admin/metrics/usage',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getUsageMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/metrics/performance
 * Get performance metrics including memory, uptime, API timing
 * Returns: PerformanceMetrics
 */
router.get(
  '/admin/metrics/performance',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getPerformanceMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/metrics/audit
 * Get audit/security metrics including action distribution, top actors, login stats
 * Returns: AuditMetrics
 */
router.get(
  '/admin/metrics/audit',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getAuditMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
