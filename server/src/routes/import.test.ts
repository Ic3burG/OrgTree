import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import importRouter from './import.js';
import * as memberService from '../services/member.service.js';
import * as auditService from '../services/audit.service.js';

// Mock dependencies
vi.mock('../services/member.service.js');
vi.mock('../services/audit.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

describe('Import Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', importRouter);

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

  const createAuthToken = (userId = '1', role: 'user' | 'admin' | 'superuser' = 'admin') => {
    return jwt.sign(
      { id: userId, email: 'admin@example.com', name: 'Admin User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('POST /api/organizations/:orgId/import', () => {
    it('should reject invalid data format', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ data: 'not-an-array' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Invalid data format',
      });
    });

    it('should reject missing data field', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        message: 'Invalid data format',
      });
    });

    it('should reject imports exceeding maximum size', async () => {
      const largeData = Array(10001)
        .fill(null)
        .map((_, i) => ({
          type: 'department',
          path: `/Dept${i}`,
          name: `Department ${i}`,
        }));

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ data: largeData })
        .expect(400);

      expect(response.body.message).toContain('exceeds maximum limit');
    });

    it('should require admin permission', async () => {
      vi.mocked(memberService.requireOrgPermission).mockImplementation(() => {
        throw new Error('Insufficient permissions');
      });

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          data: [
            { type: 'department', path: '/Test', name: 'Test' },
          ],
        })
        .expect(500);

      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/organizations/org1/import')
        .send({
          data: [
            { type: 'department', path: '/Test', name: 'Test' },
          ],
        })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});
