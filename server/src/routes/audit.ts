import express, { Response, NextFunction } from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import { getAuditLogs, getAllAuditLogs, cleanupOldLogs } from '../services/audit.service.js';
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
router.get('/organizations/:orgId/audit-logs', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.params.orgId!;
    const userId = req.user!.id;

    // Verify user has admin permission for this organization
    await requireOrgPermission(orgId, userId, 'admin');

    // Clean up old logs (1 year retention)
    cleanupOldLogs();

    // Get audit logs with filters
    const filters: any = {};
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
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs across all organizations (superuser only)
 * Access: Superuser role
 * Query params: Same as organization endpoint + optional orgId filter
 */
router.get('/admin/audit-logs', requireSuperuser, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Clean up old logs (1 year retention)
    cleanupOldLogs();

    // Get all audit logs with filters
    const filters: any = {};
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
});

export default router;
