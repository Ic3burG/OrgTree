import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../services/org.service.js');
vi.mock('../services/member.service.js', () => ({
  requireOrgPermission: vi.fn(),
  getMemberRole: vi.fn(),
  addMember: vi.fn(),
}));
vi.mock('../services/socket-events.service.js');

// Mock DB for share token logic
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
    })),
    transaction: vi.fn(cb => cb),
  },
}));

// Mock ownership transfer service
const mockOwnershipService = {
  initiateTransfer: vi.fn(),
  listTransfers: vi.fn(),
};
vi.mock('../services/ownership-transfer.service.js', () => mockOwnershipService);

import organizationsRouter from './organizations.js';
import * as orgService from '../services/org.service.js';
import { requireOrgPermission } from '../services/member.service.js';
import db from '../db.js';

describe('Organizations Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;
  const JWT_SECRET = 'test-secret-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.FRONTEND_URL = 'http://test-frontend';

    app = express();
    app.use(express.json());
    app.use('/api', organizationsRouter);

    app.use(
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err.status || 500).json({ message: err.message });
      }
    );
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = 'user-1', role = 'viewer') => {
    return jwt.sign(
      { id: userId, email: 'test@example.com', name: 'Test User', role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  describe('CRUD Operations', () => {
    it('should get organization list', async () => {
      const mockOrgs = [{ id: '1', name: 'Org 1' }];
      vi.mocked(orgService.getOrganizations).mockResolvedValue(mockOrgs as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockOrgs);
      expect(orgService.getOrganizations).toHaveBeenCalledWith('user-1');
    });

    it('should get organization by ID', async () => {
      const mockOrg = { id: '1', name: 'Org 1' };
      vi.mocked(orgService.getOrganizationById).mockResolvedValue(mockOrg as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/organizations/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockOrg);
    });

    it('should create organization', async () => {
      const newOrg = { id: '2', name: 'New Org' };
      vi.mocked(orgService.createOrganization).mockResolvedValue(newOrg as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Org' })
        .expect(201);

      expect(response.body).toEqual(newOrg);
      expect(orgService.createOrganization).toHaveBeenCalledWith('New Org', 'user-1');
    });

    it('should return 400 when creating organization with missing name', async () => {
      const token = createAuthToken();
      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should update organization', async () => {
      const updatedOrg = { id: '1', name: 'Updated Org' };
      vi.mocked(orgService.updateOrganization).mockResolvedValue(updatedOrg as any);

      const token = createAuthToken();
      await request(app)
        .put('/api/organizations/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Org' })
        .expect(200);

      expect(orgService.updateOrganization).toHaveBeenCalledWith('1', 'Updated Org', 'user-1');
    });

    it('should return 400 when updating organization with missing name', async () => {
      const token = createAuthToken();
      await request(app)
        .put('/api/organizations/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: ' ' })
        .expect(400);
    });

    it('should delete organization', async () => {
      const token = createAuthToken();
      await request(app)
        .delete('/api/organizations/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(orgService.deleteOrganization).toHaveBeenCalledWith('1', 'user-1');
    });
  });

  describe('Sharing Endpoints', () => {
    it('should get sharing settings', async () => {
      const mockOrg = { id: '1', name: 'Org 1', is_public: 1, share_token: 'abc' };

      const getMock = vi.fn().mockReturnValue(mockOrg);
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/organizations/1/share')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        isPublic: true,
        shareToken: 'abc',
        shareUrl: 'http://test-frontend/public/abc',
      });
      expect(requireOrgPermission).toHaveBeenCalledWith('1', 'user-1', 'viewer');
    });

    it('should return 404 if organization not found in sharing', async () => {
      const getMock = vi.fn().mockReturnValue(undefined);
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      const token = createAuthToken();
      await request(app)
        .get('/api/organizations/non-existent/share')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should toggle sharing (enable public)', async () => {
      const mockOrg = { id: '1', share_token: 'existing-token' };
      const getMock = vi.fn().mockReturnValue(mockOrg);
      const runMock = vi.fn();
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: getMock,
            run: runMock,
          }) as any
      );

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/1/share')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublic: true })
        .expect(200);

      expect(requireOrgPermission).toHaveBeenCalledWith('1', 'user-1', 'admin');
      expect(runMock).toHaveBeenCalledWith(1, 'existing-token', '1');
      expect(response.body.isPublic).toBe(true);
    });

    it('should regenerate share token', async () => {
      const mockOrg = { id: '1', is_public: 1 };
      const getMock = vi.fn().mockReturnValue(mockOrg);
      const runMock = vi.fn();
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: getMock,
            run: runMock,
          }) as any
      );

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/1/share/regenerate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(requireOrgPermission).toHaveBeenCalledWith('1', 'user-1', 'admin');
      expect(response.body.shareToken).toHaveLength(32);
      expect(runMock).toHaveBeenCalled();
    });
  });

  describe('Ownership Transfer Endpoints', () => {
    it('should initiate ownership transfer', async () => {
      const mockTransfer = { id: 't1', status: 'pending' };
      mockOwnershipService.initiateTransfer.mockReturnValue(mockTransfer);

      const token = createAuthToken('user-1', 'superuser');
      const response = await request(app)
        .post('/api/organizations/org-1/ownership/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({ toUserId: 'user-2', reason: 'Leaving' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.transfer).toEqual(mockTransfer);
      expect(mockOwnershipService.initiateTransfer).toHaveBeenCalled();
    });

    it('should return 400 if toUserId or reason is missing', async () => {
      const token = createAuthToken('user-1', 'superuser');
      await request(app)
        .post('/api/organizations/org-1/ownership/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({ toUserId: 'user-2' })
        .expect(400);
    });

    it('should list ownership transfers', async () => {
      const mockTransfers = [{ id: 't1' }];
      mockOwnershipService.listTransfers.mockReturnValue(mockTransfers);

      const token = createAuthToken('user-1', 'admin');
      const response = await request(app)
        .get('/api/organizations/org-1/ownership/transfers')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'pending', limit: 10, offset: 0 })
        .expect(200);

      expect(response.body).toEqual(mockTransfers);
      expect(mockOwnershipService.listTransfers).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        expect.objectContaining({ status: 'pending', limit: 10, offset: 0 })
      );
    });
  });
});
