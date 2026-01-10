import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import auditRouter from './audit.js';
import * as auditService from '../services/audit.service.js';
import * as memberService from '../services/member.service.js';

// Mock dependencies
vi.mock('../services/audit.service.js');
vi.mock('../services/member.service.js');

describe('Audit Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', auditRouter);

    // Setup error handler
    app.use(
      (
        _err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
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

  describe('GET /api/organizations/:orgId/audit-logs', () => {
    it('should return audit logs for an organization', async () => {
      const mockLogs = {
        logs: [
          {
            id: '1',
            actionType: 'created',
            entityType: 'department',
            timestamp: '2024-01-01',
          },
        ],
        cursor: 'next-page',
        hasMore: false,
      };

      vi.mocked(memberService.requireOrgPermission).mockReturnValue({ allowed: true } as any);
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAuditLogs).mockReturnValue(mockLogs as any);

      const token = createAuthToken('1', 'admin');
      const response = await request(app)
        .get('/api/organizations/org1/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockLogs);
      expect(memberService.requireOrgPermission).toHaveBeenCalledWith('org1', '1', 'admin');
      expect(auditService.cleanupOldLogs).toHaveBeenCalled();
    });

    it('should filter audit logs by action type', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({ allowed: true } as any);
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAuditLogs).mockReturnValue({ logs: [], hasMore: false } as any);

      const token = createAuthToken('1', 'admin');
      await request(app)
        .get('/api/organizations/org1/audit-logs?actionType=deleted&limit=25')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith('org1', {
        actionType: 'deleted',
        limit: '25',
      });
    });

    it('should filter audit logs by entity type', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({ allowed: true } as any);
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAuditLogs).mockReturnValue({ logs: [], hasMore: false } as any);

      const token = createAuthToken('1', 'admin');
      await request(app)
        .get('/api/organizations/org1/audit-logs?entityType=person')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith('org1', {
        entityType: 'person',
      });
    });

    it('should filter audit logs by date range', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({ allowed: true } as any);
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAuditLogs).mockReturnValue({ logs: [], hasMore: false } as any);

      const token = createAuthToken('1', 'admin');
      await request(app)
        .get('/api/organizations/org1/audit-logs?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith('org1', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should support pagination with cursor', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({ allowed: true } as any);
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAuditLogs).mockReturnValue({ logs: [], hasMore: true } as any);

      const token = createAuthToken('1', 'admin');
      await request(app)
        .get('/api/organizations/org1/audit-logs?cursor=abc123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith('org1', {
        cursor: 'abc123',
      });
    });

    it('should reject non-admin users', async () => {
      vi.mocked(memberService.requireOrgPermission).mockImplementation(() => {
        throw new Error('Insufficient permissions');
      });

      const token = createAuthToken('1', 'user');
      const response = await request(app)
        .get('/api/organizations/org1/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/organizations/org1/audit-logs')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should return all audit logs for superuser', async () => {
      const mockLogs = {
        logs: [
          {
            id: '1',
            organizationId: 'org1',
            actionType: 'created',
            timestamp: '2024-01-01',
          },
          {
            id: '2',
            organizationId: 'org2',
            actionType: 'updated',
            timestamp: '2024-01-02',
          },
        ],
        hasMore: false,
      };

      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAllAuditLogs).mockReturnValue(mockLogs as any);

      const token = createAuthToken('1', 'superuser');
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockLogs);
      expect(auditService.getAllAuditLogs).toHaveBeenCalledWith({});
    });

    it('should filter by organization ID', async () => {
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAllAuditLogs).mockReturnValue({ logs: [], hasMore: false } as any);

      const token = createAuthToken('1', 'superuser');
      await request(app)
        .get('/api/admin/audit-logs?orgId=org1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditService.getAllAuditLogs).toHaveBeenCalledWith({
        orgId: 'org1',
      });
    });

    it('should support all filters', async () => {
      vi.mocked(auditService.cleanupOldLogs).mockReturnValue(0);
      vi.mocked(auditService.getAllAuditLogs).mockReturnValue({ logs: [], hasMore: false } as any);

      const token = createAuthToken('1', 'superuser');
      await request(app)
        .get('/api/admin/audit-logs?actionType=deleted&entityType=person&limit=100&orgId=org1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditService.getAllAuditLogs).toHaveBeenCalledWith({
        actionType: 'deleted',
        entityType: 'person',
        limit: '100',
        orgId: 'org1',
      });
    });

    it('should reject non-superuser requests', async () => {
      const token = createAuthToken('1', 'admin');
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Insufficient permissions',
      });
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});
