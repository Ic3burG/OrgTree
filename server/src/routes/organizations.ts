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
import { emitOrgUpdated, emitOrgSettings } from '../services/socket-events.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/organizations
router.get(
  '/organizations',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgs = await getOrganizations(req.user!.id);
      res.json(orgs);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id
router.get(
  '/organizations/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const org = await getOrganizationById(req.params.id!, req.user!.id);
      res.json(org);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations
router.post(
  '/organizations',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ message: 'Organization name is required' });
        return;
      }

      const org = await createOrganization(name.trim(), req.user!.id);
      res.status(201).json(org);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:id
router.put(
  '/organizations/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ message: 'Organization name is required' });
        return;
      }

      const org = await updateOrganization(req.params.id!, (name as string).trim(), req.user!.id);

      // Emit real-time event
      emitOrgUpdated(req.params.id!, org as unknown as Record<string, unknown>, req.user!);

      res.json(org);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/organizations/:id
router.delete(
  '/organizations/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await deleteOrganization(req.params.id!, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id/share
// Get sharing settings for an organization (any member can view)
router.get(
  '/organizations/:id/share',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Any member can view share settings (viewer or higher)
      requireOrgPermission(id!, req.user!.id, 'viewer');

      const org = db
        .prepare(
          `
      SELECT id, name, is_public, share_token
      FROM organizations
      WHERE id = ?
    `
        )
        .get(id) as
        | { id: string; name: string; is_public: number; share_token: string | null }
        | undefined;

      if (!org) {
        res.status(404).json({ message: 'Organization not found' });
        return;
      }

      res.json({
        isPublic: org.is_public === 1,
        shareToken: org.share_token,
        shareUrl: org.share_token
          ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${org.share_token}`
          : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:id/share
// Toggle organization public/private status (requires admin)
router.put(
  '/organizations/:id/share',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id!;
      const { isPublic } = req.body;

      // Verify admin permission
      requireOrgPermission(id, req.user!.id, 'admin');

      const org = db
        .prepare(
          `
      SELECT id, share_token
      FROM organizations
      WHERE id = ?
    `
        )
        .get(id) as { id: string; share_token: string | null } | undefined;

      if (!org) {
        res.status(404).json({ message: 'Organization not found' });
        return;
      }

      // Generate share token if making public and doesn't have one
      let shareToken = org.share_token;
      if (isPublic && !shareToken) {
        shareToken = randomBytes(16).toString('hex');
      }

      // Update organization
      db.prepare(
        `
      UPDATE organizations
      SET is_public = ?, share_token = ?, updated_at = datetime('now')
      WHERE id = ?
    `
      ).run(isPublic ? 1 : 0, shareToken, id);

      const settings = {
        isPublic,
        shareToken,
        shareUrl: shareToken
          ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${shareToken}`
          : null,
      };

      // Emit real-time event
      emitOrgSettings(id, settings, req.user!);

      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:id/share/regenerate
// Regenerate share token for an organization (requires admin)
router.post(
  '/organizations/:id/share/regenerate',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id!;

      // Verify admin permission
      requireOrgPermission(id, req.user!.id, 'admin');

      const org = db
        .prepare(
          `
      SELECT id, is_public
      FROM organizations
      WHERE id = ?
    `
        )
        .get(id) as { id: string; is_public: number } | undefined;

      if (!org) {
        res.status(404).json({ message: 'Organization not found' });
        return;
      }

      // Generate new share token
      const shareToken = randomBytes(16).toString('hex');

      // Update organization
      db.prepare(
        `
      UPDATE organizations
      SET share_token = ?, updated_at = datetime('now')
      WHERE id = ?
    `
      ).run(shareToken, id);

      const settings = {
        shareToken,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${shareToken}`,
        isPublic: org.is_public === 1,
      };

      // Emit real-time event
      emitOrgSettings(id, settings, req.user!);

      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:id/ownership/transfer
// Initiate ownership transfer (Super User only)
router.post(
  '/organizations/:id/ownership/transfer',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      const { toUserId, reason } = req.body;

      if (!toUserId || !reason) {
        res.status(400).json({ message: 'toUserId and reason are required' });
        return;
      }

      const ipAddress = req.ip || null;
      const userAgent = req.get('user-agent') || null;

      const { initiateTransfer } = await import('../services/ownership-transfer.service.js');
      const transfer = initiateTransfer(
        orgId,
        req.user!.id,
        toUserId,
        reason,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        transfer,
        message: 'Ownership transfer initiated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:id/ownership/transfers
// List all transfers for an organization (Admin+ only)
router.get(
  '/organizations/:id/ownership/transfers',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.id!;
      const { status, limit, offset } = req.query;

      const filters = {
        status: status as 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const { listTransfers } = await import('../services/ownership-transfer.service.js');
      const transfers = listTransfers(orgId, req.user!.id, filters);

      res.json(transfers);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
