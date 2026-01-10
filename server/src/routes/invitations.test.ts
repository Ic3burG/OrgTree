import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import invitationsRouter from './invitations.js';
import * as invitationService from '../services/invitation.service.js';

// Mock dependencies
vi.mock('../services/invitation.service.js');

describe('Invitations Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', invitationsRouter);

    // Setup error handler
    app.use(
      (_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ message: _err.message });
      }
    );
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = '1', role: 'user' | 'admin' | 'superuser' = 'user') => {
    return jwt.sign(
      { id: userId, email: 'test@example.com', name: 'Test User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('POST /api/organizations/:orgId/invitations', () => {
    it('should create a new invitation', async () => {
      const mockInvitation = {
        id: '1',
        token: 'invite-token-123',
        email: 'newuser@example.com',
        role: 'editor',
        organizationId: 'org1',
        organizationName: 'Test Org',
        invitedBy: 'Test User',
        expiresAt: '2024-02-01',
      };

      vi.mocked(invitationService.createInvitation).mockResolvedValue(mockInvitation as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@example.com',
          role: 'editor',
        })
        .expect(201);

      expect(response.body).toEqual(mockInvitation);
      expect(invitationService.createInvitation).toHaveBeenCalledWith(
        'org1',
        'newuser@example.com',
        'editor',
        '1'
      );
    });

    it('should reject invitation with missing email', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'editor',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email is required',
      });
    });

    it('should reject invitation with missing role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/invitations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@example.com',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Role is required',
      });
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/organizations/org1/invitations')
        .send({
          email: 'newuser@example.com',
          role: 'editor',
        })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });

  describe('GET /api/organizations/:orgId/invitations', () => {
    it('should return pending invitations', async () => {
      const mockInvitations = [
        {
          id: '1',
          email: 'user1@example.com',
          role: 'editor',
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          email: 'user2@example.com',
          role: 'viewer',
          createdAt: '2024-01-02',
        },
      ];

      vi.mocked(invitationService.getOrgInvitations).mockReturnValue(mockInvitations as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/organizations/org1/invitations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockInvitations);
      expect(invitationService.getOrgInvitations).toHaveBeenCalledWith('org1', '1');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/organizations/org1/invitations').expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });

  describe('DELETE /api/organizations/:orgId/invitations/:invitationId', () => {
    it('should cancel an invitation', async () => {
      vi.mocked(invitationService.cancelInvitation).mockResolvedValue(undefined as any);

      const token = createAuthToken();
      await request(app)
        .delete('/api/organizations/org1/invitations/inv123')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(invitationService.cancelInvitation).toHaveBeenCalledWith('org1', 'inv123', '1');
    });

    it('should handle cancellation errors', async () => {
      vi.mocked(invitationService.cancelInvitation).mockRejectedValue(
        new Error('Invitation not found')
      );

      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/organizations/org1/invitations/inv999')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Invitation not found',
      });
    });
  });

  describe('GET /api/invitations/:token', () => {
    it('should return invitation details', async () => {
      const mockInvitation = {
        id: '1',
        token: 'valid-token',
        email: 'user@example.com',
        role: 'editor',
        organizationName: 'Test Org',
        invitedBy: 'Admin User',
      };

      vi.mocked(invitationService.getInvitationByToken).mockReturnValue(mockInvitation as any);

      const response = await request(app).get('/api/invitations/valid-token').expect(200);

      expect(response.body).toEqual(mockInvitation);
      expect(invitationService.getInvitationByToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return 404 for invalid token', async () => {
      vi.mocked(invitationService.getInvitationByToken).mockReturnValue(null);

      const response = await request(app).get('/api/invitations/invalid-token').expect(404);

      expect(response.body).toEqual({
        message: 'Invitation not found',
      });
    });
  });

  describe('POST /api/invitations/:token/accept', () => {
    it('should accept an invitation', async () => {
      const mockResult = {
        success: true,
        organizationId: 'org1',
        organizationName: 'Test Org',
        role: 'editor',
      };

      vi.mocked(invitationService.acceptInvitation).mockResolvedValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/invitations/valid-token/accept')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(invitationService.acceptInvitation).toHaveBeenCalledWith('valid-token', '1');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).post('/api/invitations/valid-token/accept').expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });

    it('should handle acceptance errors', async () => {
      vi.mocked(invitationService.acceptInvitation).mockRejectedValue(
        new Error('Invitation expired')
      );

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/invitations/expired-token/accept')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Invitation expired',
      });
    });
  });
});
