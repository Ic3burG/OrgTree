import express from 'express';
import { randomBytes } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db.js';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../services/org.service.js';
import { requireOrgPermission } from '../services/member.service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/organizations
router.get('/organizations', async (req, res, next) => {
  try {
    const orgs = await getOrganizations(req.user.id);
    res.json(orgs);
  } catch (err) {
    next(err);
  }
});

// GET /api/organizations/:id
router.get('/organizations/:id', async (req, res, next) => {
  try {
    const org = await getOrganizationById(req.params.id, req.user.id);
    res.json(org);
  } catch (err) {
    next(err);
  }
});

// POST /api/organizations
router.post('/organizations', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const org = await createOrganization(name.trim(), req.user.id);
    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:id
router.put('/organizations/:id', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const org = await updateOrganization(req.params.id, name.trim(), req.user.id);
    res.json(org);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/organizations/:id
router.delete('/organizations/:id', async (req, res, next) => {
  try {
    await deleteOrganization(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/organizations/:id/share
// Get sharing settings for an organization (requires admin)
router.get('/organizations/:id/share', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify admin permission
    requireOrgPermission(id, req.user.id, 'admin');

    const org = db.prepare(`
      SELECT id, name, is_public, share_token
      FROM organizations
      WHERE id = ?
    `).get(id);

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({
      isPublic: org.is_public === 1,
      shareToken: org.share_token,
      shareUrl: org.share_token
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${org.share_token}`
        : null
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:id/share
// Toggle organization public/private status (requires admin)
router.put('/organizations/:id/share', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    // Verify admin permission
    requireOrgPermission(id, req.user.id, 'admin');

    const org = db.prepare(`
      SELECT id, share_token
      FROM organizations
      WHERE id = ?
    `).get(id);

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Generate share token if making public and doesn't have one
    let shareToken = org.share_token;
    if (isPublic && !shareToken) {
      shareToken = randomBytes(16).toString('hex');
    }

    // Update organization
    db.prepare(`
      UPDATE organizations
      SET is_public = ?, share_token = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(isPublic ? 1 : 0, shareToken, id);

    res.json({
      isPublic,
      shareToken,
      shareUrl: shareToken
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${shareToken}`
        : null
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/organizations/:id/share/regenerate
// Regenerate share token for an organization (requires admin)
router.post('/organizations/:id/share/regenerate', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify admin permission
    requireOrgPermission(id, req.user.id, 'admin');

    const org = db.prepare(`
      SELECT id, is_public
      FROM organizations
      WHERE id = ?
    `).get(id);

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Generate new share token
    const shareToken = randomBytes(16).toString('hex');

    // Update organization
    db.prepare(`
      UPDATE organizations
      SET share_token = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(shareToken, id);

    res.json({
      shareToken,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${shareToken}`,
      isPublic: org.is_public === 1
    });
  } catch (err) {
    next(err);
  }
});

export default router;
