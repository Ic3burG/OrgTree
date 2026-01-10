import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getOrgMembers,
  addOrgMember,
  addMemberByEmail,
  updateMemberRole,
  removeOrgMember,
  requireOrgPermission,
} from '../services/member.service.js';
import {
  emitMemberAdded,
  emitMemberUpdated,
  emitMemberRemoved,
} from '../services/socket-events.service.js';
import db from '../db.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/organizations/:orgId/members
// Get all members of an organization (requires admin)
router.get(
  '/organizations/:orgId/members',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId!;

      // Security: Verify user has admin permission using standard pattern
      requireOrgPermission(orgId, req.user!.id, 'admin');

      const members = getOrgMembers(orgId);

      // Also include owner info
      const org = db
        .prepare(
          `
      SELECT o.created_by_id, u.name, u.email
      FROM organizations o
      JOIN users u ON o.created_by_id = u.id
      WHERE o.id = ?
    `
        )
        .get(orgId) as { created_by_id: string; name: string; email: string } | undefined;

      if (!org) {
        res.status(404).json({ message: 'Organization not found' });
        return;
      }

      res.json({
        owner: {
          userId: org.created_by_id,
          userName: org.name,
          userEmail: org.email,
          role: 'owner',
        },
        members,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:orgId/members
// Add a new member (requires admin)
router.post(
  '/organizations/:orgId/members',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId!;
      const { userId, role } = req.body;

      if (!userId || !role) {
        res.status(400).json({ message: 'userId and role are required' });
        return;
      }

      const validRoles = ['viewer', 'editor', 'admin'] as const;
      if (!validRoles.includes(role)) {
        res.status(400).json({
          message: 'Invalid role. Must be: viewer, editor, or admin',
        });
        return;
      }

      const member = addOrgMember(
        orgId,
        userId as string,
        role as 'admin' | 'editor' | 'viewer',
        req.user!.id
      );

      // Emit real-time event
      emitMemberAdded(orgId, member as unknown as Record<string, unknown>, req.user!);

      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:orgId/members/:memberId
// Update member role (requires admin)
router.put(
  '/organizations/:orgId/members/:memberId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId!;
      const memberId = req.params.memberId!;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ message: 'role is required' });
        return;
      }

      const validRoles = ['viewer', 'editor', 'admin'] as const;
      if (!validRoles.includes(role)) {
        res.status(400).json({
          message: 'Invalid role. Must be: viewer, editor, or admin',
        });
        return;
      }

      const member = updateMemberRole(
        orgId,
        memberId,
        role as 'admin' | 'editor' | 'viewer',
        req.user!.id
      );

      // Emit real-time event
      emitMemberUpdated(orgId, member as unknown as Record<string, unknown>, req.user!);

      res.json(member);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/organizations/:orgId/members/:memberId
// Remove a member (requires admin)
router.delete(
  '/organizations/:orgId/members/:memberId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId!;
      const memberId = req.params.memberId!;

      // Get full member data before removing for audit trail
      const member = db
        .prepare(
          `
      SELECT om.id, om.user_id as userId, om.role, u.name as userName, u.email
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.id = ? AND om.organization_id = ?
    `
        )
        .get(memberId, orgId) as
        | { id: string; userId: string; role: string; userName: string; email: string }
        | undefined;

      await removeOrgMember(orgId, memberId, req.user!.id);

      // Emit real-time event with full member data
      if (member) {
        emitMemberRemoved(orgId, member, req.user!);
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:orgId/members/by-email
// Add a member by email address (requires admin)
// Returns { success: true, member } or { success: false, error: 'user_not_found' }
router.post(
  '/organizations/:orgId/members/by-email',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId!;
      const { email, role } = req.body;

      if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
      }

      if (!role) {
        res.status(400).json({ message: 'Role is required' });
        return;
      }

      const validRoles = ['viewer', 'editor', 'admin'] as const;
      if (!validRoles.includes(role)) {
        res.status(400).json({
          message: 'Invalid role. Must be: viewer, editor, or admin',
        });
        return;
      }

      const result = addMemberByEmail(
        orgId,
        email as string,
        role as 'admin' | 'editor' | 'viewer',
        req.user!.id
      );

      if (result.success) {
        // Emit real-time event
        emitMemberAdded(orgId, result.member as unknown as Record<string, unknown>, req.user!);
        res.status(201).json(result);
      } else {
        // User not found - return 200 with success: false so frontend can offer to send invite
        res.json(result);
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
