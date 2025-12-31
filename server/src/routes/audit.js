import express from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import {
  getAuditLogs,
  getAllAuditLogs,
  cleanupOldLogs
} from '../services/audit.service.js';

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
router.get('/organizations/:orgId/audit-logs', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;

    // Verify user has admin permission for this organization
    await requireOrgPermission(orgId, userId, 'admin');

    // Clean up old logs (1 year retention)
    cleanupOldLogs();

    // Get audit logs with filters
    const result = getAuditLogs(orgId, {
      limit: req.query.limit,
      cursor: req.query.cursor,
      actionType: req.query.actionType,
      entityType: req.query.entityType,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

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
router.get('/admin/audit-logs', requireSuperuser, async (req, res, next) => {
  try {
    // Clean up old logs (1 year retention)
    cleanupOldLogs();

    // Get all audit logs with filters
    const result = getAllAuditLogs({
      limit: req.query.limit,
      cursor: req.query.cursor,
      actionType: req.query.actionType,
      entityType: req.query.entityType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      orgId: req.query.orgId
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
