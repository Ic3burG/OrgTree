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
    transaction: vi.fn((cb) => cb),
  },
}));

import organizationsRouter from './organizations.js';
import * as orgService from '../services/org.service.js';
import { requireOrgPermission } from '../services/member.service.js';
import db from '../db.js';

describe('Organizations Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.FRONTEND_URL = 'http://test-frontend';

    app = express();
    app.use(express.json());
    app.use('/api', organizationsRouter);

    app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ message: _err.message });
    });
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = 'user-1', role = 'viewer') => {
    return jwt.sign(
      { id: userId, email: 'test@example.com', name: 'Test User', role },
      'test-secret-key',
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

    it('should update organization', async () => {
        const updatedOrg = { id: '1', name: 'Updated Org' };
        vi.mocked(orgService.updateOrganization).mockResolvedValue(updatedOrg as any);

        const token = createAuthToken();
        const response = await request(app)
          .put('/api/organizations/1')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Updated Org' })
          .expect(200);

        expect(orgService.updateOrganization).toHaveBeenCalledWith('1', 'Updated Org', 'user-1');
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
        
        // Mock DB response
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
            shareUrl: 'http://test-frontend/public/abc'
        });
        expect(requireOrgPermission).toHaveBeenCalledWith('1', 'user-1', 'viewer');
    });

    it('should toggle sharing (enable public)', async () => {
        const mockOrg = { id: '1', share_token: 'existing-token' };
        const getMock = vi.fn().mockReturnValue(mockOrg);
        const runMock = vi.fn();
        vi.mocked(db.prepare).mockImplementation(() => ({
            get: getMock,
            run: runMock,
        } as any));

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
        vi.mocked(db.prepare).mockImplementation(() => ({
            get: getMock,
            run: runMock,
        } as any));

        const token = createAuthToken();
        const response = await request(app)
            .post('/api/organizations/1/share/regenerate')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        
        expect(requireOrgPermission).toHaveBeenCalledWith('1', 'user-1', 'admin');
        // New token should be generated (we can't strict equal check random hex here easily without stubbing crypto, but length check works)
        expect(response.body.shareToken).toHaveLength(32); // 16 bytes hex = 32 chars
        expect(runMock).toHaveBeenCalled();
    });
  });
});
