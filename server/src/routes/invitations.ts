import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createInvitation,
  getOrgInvitations,
  resendInvitation,
  cancelInvitation,
  getInvitationByToken,
  acceptInvitation,
  isEmailConfigured,
} from '../services/invitation.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// POST /api/organizations/:orgId/invitations
// Send an invitation (requires admin)
router.post(
  '/organizations/:orgId/invitations',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { email, role } = req.body;

      if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
      }

      if (!role) {
        res.status(400).json({ message: 'Role is required' });
        return;
      }

      const invitation = await createInvitation(orgId!, email, role, req.user!.id);
      res.status(201).json(invitation);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:orgId/invitations/:invitationId/resend
// Resend an invitation (requires admin)
router.post(
  '/organizations/:orgId/invitations/:invitationId/resend',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, invitationId } = req.params;
      const invitation = await resendInvitation(orgId!, invitationId!, req.user!.id);
      res.json(invitation);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:orgId/invitations
// Get pending invitations (requires admin)
router.get(
  '/organizations/:orgId/invitations',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const invitations = getOrgInvitations(orgId!, req.user!.id);
      res.json(invitations);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/organizations/:orgId/invitations/:invitationId
// Cancel an invitation (requires admin)
router.delete(
  '/organizations/:orgId/invitations/:invitationId',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, invitationId } = req.params;
      await cancelInvitation(orgId!, invitationId!, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/invitations/:token
// Get invitation details (public - for viewing before accepting)
router.get(
  '/invitations/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const invitation = getInvitationByToken(token!);

      if (!invitation) {
        res.status(404).json({ message: 'Invitation not found' });
        return;
      }

      res.json(invitation);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/invitations/:token/accept
// Accept an invitation (requires authentication)
router.post(
  '/invitations/:token/accept',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const result = await acceptInvitation(token!, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/invitations/status
// Check if email service is configured
router.get(
  '/invitations/status',
  authenticateToken,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ emailConfigured: isEmailConfigured() });
  }
);

export default router;
