import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getOrgMembers,
  addOrgMember,
  updateMemberRole,
  removeOrgMember,
  checkOrgAccess
} from '../services/member.service.js';
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
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/members/search
// Search users for adding as members
// Returns users excluding current user and already-members
router.get('/members/search', async (req, res, next) => {
  try {
    const { q, orgId } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Get existing member IDs and owner ID
    let excludeIds = [req.user.id]; // Always exclude self

    if (orgId) {
      const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId);
      if (org) {
        excludeIds.push(org.created_by_id); // Exclude owner
      }

      const members = db.prepare(
        'SELECT user_id FROM organization_members WHERE organization_id = ?'
      ).all(orgId);

      excludeIds.push(...members.map(m => m.user_id));
    }

    // Search users by name or email
    const searchPattern = `%${q}%`;
    const placeholders = excludeIds.map(() => '?').join(',');

    const users = db.prepare(`
      SELECT id, name, email
      FROM users
      WHERE (name LIKE ? OR email LIKE ?)
        AND id NOT IN (${placeholders})
      ORDER BY name
      LIMIT 10
    `).all(searchPattern, searchPattern, ...excludeIds);

    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
