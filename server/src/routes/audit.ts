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
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import {
  getAuditLogs,
  getAllAuditLogs,
  cleanupOldLogs,
  getAuditFilterOptions,
} from '../services/audit.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/organizations/:orgId/audit-logs
 * Get audit logs for a specific organization
 * Access: Admin role or above
 * Query params:
 *   - limit: Max records (default 50)
 *   - cursor: Pagination cursor
 *   - actionType: Filter by action (created, updated, deleted, etc.)
 *   - entityType: Filter by entity (department, person, member, org)
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 */
router.get(
  '/organizations/:orgId/audit-logs',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId!;
      const userId = req.user!.id;

      // Verify user has admin permission for this organization
      await requireOrgPermission(orgId, userId, 'admin');

      // Clean up old logs (1 year retention)
      cleanupOldLogs();

      // Get audit logs with filters
      const filters: Record<string, string> = {};
      if (req.query.limit) filters.limit = String(req.query.limit);
      if (req.query.cursor) filters.cursor = String(req.query.cursor);
      if (req.query.actionType) filters.actionType = String(req.query.actionType);
      if (req.query.entityType) filters.entityType = String(req.query.entityType);
      if (req.query.startDate) filters.startDate = String(req.query.startDate);
      if (req.query.endDate) filters.endDate = String(req.query.endDate);

      const result = getAuditLogs(orgId, filters);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs across all organizations (superuser only)
 * Access: Superuser role
 * Query params: Same as organization endpoint + optional orgId filter
 */
router.get(
  '/admin/audit-logs',
  requireSuperuser,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Clean up old logs (1 year retention)
      cleanupOldLogs();

      // Get all audit logs with filters
      const filters: Record<string, string> = {};
      if (req.query.limit) filters.limit = String(req.query.limit);
      if (req.query.cursor) filters.cursor = String(req.query.cursor);
      if (req.query.actionType) filters.actionType = String(req.query.actionType);
      if (req.query.entityType) filters.entityType = String(req.query.entityType);
      if (req.query.startDate) filters.startDate = String(req.query.startDate);
      if (req.query.endDate) filters.endDate = String(req.query.endDate);
      if (req.query.orgId) filters.orgId = String(req.query.orgId);

      const result = getAllAuditLogs(filters);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/audit-logs/filter-options
 * Get distinct action types and entity types for filter dropdowns
 * Access: Superuser role
 */
router.get(
  '/admin/audit-logs/filter-options',
  requireSuperuser,
  (_req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const options = getAuditFilterOptions();
      res.json(options);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
