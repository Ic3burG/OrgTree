import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    try {
      const user = jwt.verify(token, 'test-secret-key');
      req.user = user;
      next();
    } catch (err) {
      return res.sendStatus(403);
    }
  },
}));

// Mock services
vi.mock('../services/ownership-transfer.service.js', () => ({
  initiateTransfer: vi.fn(),
  listTransfers: vi.fn(),
  getPendingTransfersForUser: vi.fn(),
  acceptTransfer: vi.fn(),
  rejectTransfer: vi.fn(),
  cancelTransfer: vi.fn(),
  getTransferById: vi.fn(),
  getAuditLog: vi.fn(),
}));

vi.mock('../services/org.service.js');
vi.mock('../services/member.service.js');
vi.mock('../services/socket-events.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
    })),
  },
}));

import organizationsRouter from './organizations.js';
import ownershipTransfersRouter from './ownership-transfers.js';
import * as ownershipService from '../services/ownership-transfer.service.js';

describe('Ownership Transfer Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    app = express();
    app.use(express.json());
    // Mount both routers to cover all endpoints
    app.use('/api', organizationsRouter);
    app.use('/api', ownershipTransfersRouter);

    app.use(
      (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ message: err.message });
      }
    );
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

  describe('POST /api/organizations/:id/ownership/transfer', () => {
    it('should initiate transfer successfully', async () => {
      const mockTransfer = { id: 'transfer-1', status: 'pending' };
      vi.mocked(ownershipService.initiateTransfer).mockReturnValue(mockTransfer as any);

      const token = createAuthToken('owner-1');
      const response = await request(app)
        .post('/api/organizations/org-1/ownership/transfer')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'TestAgent')
        .send({ toUserId: 'user-2', reason: 'Leaving company' })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        transfer: mockTransfer,
        message: 'Ownership transfer initiated successfully',
      });
      expect(ownershipService.initiateTransfer).toHaveBeenCalledWith(
        'org-1',
        'owner-1',
        'user-2',
        'Leaving company',
        expect.any(String), // IP
        'TestAgent' // User Agent
      );
    });

    it('should fail with missing fields', async () => {
      const token = createAuthToken('owner-1');
      await request(app)
        .post('/api/organizations/org-1/ownership/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({ toUserId: 'user-2' }) // Missing reason
        .expect(400);
    });
  });

  describe('GET /api/ownership/transfers/pending', () => {
    it('should list pending transfers for user', async () => {
      const mockTransfers = [{ id: 'transfer-1' }];
      vi.mocked(ownershipService.getPendingTransfersForUser).mockResolvedValue(
        mockTransfers as any
      );

      const token = createAuthToken('user-1');
      const response = await request(app)
        .get('/api/ownership/transfers/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockTransfers);
      expect(ownershipService.getPendingTransfersForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('POST /api/ownership/transfers/:id/accept', () => {
    it('should accept transfer', async () => {
      const mockTransfer = { id: 'transfer-1', status: 'accepted' };
      vi.mocked(ownershipService.acceptTransfer).mockReturnValue(mockTransfer as any);

      const token = createAuthToken('user-1');
      const response = await request(app)
        .post('/api/ownership/transfers/transfer-1/accept')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'TestAgent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(ownershipService.acceptTransfer).toHaveBeenCalledWith(
        'transfer-1',
        'user-1',
        expect.any(String),
        'TestAgent'
      );
    });
  });

  describe('POST /api/ownership/transfers/:id/reject', () => {
    it('should reject transfer', async () => {
      const mockTransfer = { id: 'transfer-1', status: 'rejected' };
      vi.mocked(ownershipService.rejectTransfer).mockReturnValue(mockTransfer as any);

      const token = createAuthToken('user-1');
      const response = await request(app)
        .post('/api/ownership/transfers/transfer-1/reject')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'TestAgent')
        .send({ reason: 'Not interested' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(ownershipService.rejectTransfer).toHaveBeenCalledWith(
        'transfer-1',
        'user-1',
        'Not interested',
        expect.any(String),
        'TestAgent'
      );
    });
  });

  describe('POST /api/ownership/transfers/:id/cancel', () => {
    it('should cancel transfer', async () => {
      const mockTransfer = { id: 'transfer-1', status: 'cancelled' };
      vi.mocked(ownershipService.cancelTransfer).mockReturnValue(mockTransfer as any);

      const token = createAuthToken('owner-1');
      const response = await request(app)
        .post('/api/ownership/transfers/transfer-1/cancel')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'TestAgent')
        .send({ reason: 'Mistake' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(ownershipService.cancelTransfer).toHaveBeenCalledWith(
        'transfer-1',
        'owner-1',
        'Mistake',
        expect.any(String),
        'TestAgent'
      );
    });

    it('should fail with missing reason', async () => {
      const token = createAuthToken('owner-1');
      await request(app)
        .post('/api/ownership/transfers/transfer-1/cancel')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });
});
