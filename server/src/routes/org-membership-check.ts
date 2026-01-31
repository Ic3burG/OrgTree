import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkOrgAccess } from '../services/member.service.js';
import db from '../db.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

/**
 * GET /api/debug/org-membership/:orgId
 * Check if the current user has access to an organization
 */
router.get(
  '/debug/org-membership/:orgId',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId;
      if (!orgId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }
      const userId = req.user!.id;

      // Check access using the same function as search
      const access = checkOrgAccess(orgId, userId);

      // Get org details
      const org = db
        .prepare('SELECT id, name, created_by_id, is_public FROM organizations WHERE id = ?')
        .get(orgId) as
        | { id: string; name: string; created_by_id: string; is_public: number }
        | undefined;

      // Get membership details
      const membership = db
        .prepare('SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?')
        .get(orgId, userId) as { role: string } | undefined;

      // Get all members of this org (for debugging)
      const allMembers = db
        .prepare(
          `
        SELECT om.role, u.email, u.name
        FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE om.organization_id = ?
      `
        )
        .all(orgId) as Array<{ role: string; email: string; name: string }>;

      res.json({
        timestamp: new Date().toISOString(),
        currentUser: {
          id: userId,
          email: req.user!.email,
          systemRole: req.user!.role,
        },
        organization: org || { error: 'Organization not found' },
        accessCheck: {
          hasAccess: access.hasAccess,
          role: access.role,
          isOwner: access.isOwner,
        },
        directMembership: membership || { error: 'Not in organization_members table' },
        allOrgMembers: allMembers,
        diagnosis: !access.hasAccess
          ? 'User has no access to this organization'
          : access.role
            ? `User has access with role: ${access.role}`
            : 'User has access but no role assigned',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
