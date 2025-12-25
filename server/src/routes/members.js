import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getOrgMembers,
  addOrgMember,
  addMemberByEmail,
  updateMemberRole,
  removeOrgMember,
  checkOrgAccess
} from '../services/member.service.js';
import {
  emitMemberAdded,
  emitMemberUpdated,
  emitMemberRemoved
} from '../services/socket-events.service.js';
import db from '../db.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/organizations/:orgId/members
// Get all members of an organization (requires admin)
router.get('/organizations/:orgId/members', async (req, res, next) => {
  try {
    const { orgId } = req.params;

    // Verify user has admin access to view members
    const access = checkOrgAccess(orgId, req.user.id);
    if (!access.hasAccess || (access.role !== 'admin' && access.role !== 'owner')) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const members = getOrgMembers(orgId);

    // Also include owner info
    const org = db.prepare(`
      SELECT o.created_by_id, u.name, u.email
      FROM organizations o
      JOIN users u ON o.created_by_id = u.id
      WHERE o.id = ?
    `).get(orgId);

    res.json({
      owner: {
        userId: org.created_by_id,
        userName: org.name,
        userEmail: org.email,
        role: 'owner'
      },
      members
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/organizations/:orgId/members
// Add a new member (requires admin)
router.post('/organizations/:orgId/members', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ message: 'userId and role are required' });
    }

    const validRoles = ['viewer', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be: viewer, editor, or admin'
      });
    }

    const member = addOrgMember(orgId, userId, role, req.user.id);

    // Emit real-time event
    emitMemberAdded(orgId, member, req.user);

    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:orgId/members/:memberId
// Update member role (requires admin)
router.put('/organizations/:orgId/members/:memberId', async (req, res, next) => {
  try {
    const { orgId, memberId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'role is required' });
    }

    const member = updateMemberRole(orgId, memberId, role, req.user.id);

    // Emit real-time event
    emitMemberUpdated(orgId, member, req.user);

    res.json(member);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/organizations/:orgId/members/:memberId
// Remove a member (requires admin)
router.delete('/organizations/:orgId/members/:memberId', async (req, res, next) => {
  try {
    const { orgId, memberId } = req.params;

    await removeOrgMember(orgId, memberId, req.user.id);

    // Emit real-time event
    emitMemberRemoved(orgId, memberId, req.user);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/organizations/:orgId/members/by-email
// Add a member by email address (requires admin)
// Returns { success: true, member } or { success: false, error: 'user_not_found' }
router.post('/organizations/:orgId/members/by-email', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const result = addMemberByEmail(orgId, email, role, req.user.id);

    if (result.success) {
      // Emit real-time event
      emitMemberAdded(orgId, result.member, req.user);
      res.status(201).json(result);
    } else {
      // User not found - return 200 with success: false so frontend can offer to send invite
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
