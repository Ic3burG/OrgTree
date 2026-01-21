import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import totpRouter from './totp.js';
import { authenticateToken } from '../middleware/auth.js';
import * as totpService from '../services/totp.service.js';
import * as authService from '../services/auth.service.js';
import db from '../db.js';

// Mock dependencies
vi.mock('../middleware/auth.js');
vi.mock('../services/totp.service.js');
vi.mock('../services/auth.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
    })),
  },
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth/2fa', totpRouter);

describe('TOTP Routes', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default auth mock
    vi.mocked(authenticateToken).mockImplementation((req, res, next) => {
      // @ts-expect-error: mocking express request user
      req.user = mockUser;
      next();
    });

    // Mock db.prepare default behavior
    vi.mocked(db.prepare).mockReturnValue({
      get: vi.fn(),
      run: vi.fn(),
    } as any);
  });

  describe('POST /api/auth/2fa/verify-login', () => {
    it('should verify login and return tokens', async () => {
      vi.mocked(totpService.verifyTotp).mockReturnValue(true);
      
      // Mock db user lookup
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser),
        run: vi.fn(),
      } as any);

      vi.mocked(authService.generateToken).mockReturnValue('access-token');
      vi.mocked(authService.generateRefreshToken).mockReturnValue('refresh-token');

      const response = await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId: mockUser.id, token: '123456' })
        .expect(200);

      expect(response.body.accessToken).toBe('access-token');
      expect(response.body.user).toEqual(mockUser);
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=refresh-token');
      expect(totpService.verifyTotp).toHaveBeenCalledWith(mockUser.id, '123456');
    });

    it('should reject invalid token', async () => {
      vi.mocked(totpService.verifyTotp).mockReturnValue(false);

      await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId: mockUser.id, token: '123456' })
        .expect(400);
    });

    it('should check for missing params', async () => {
      await request(app)
        .post('/api/auth/2fa/verify-login')
        .send({ userId: mockUser.id }) // missing token
        .expect(400);
    });
  });

  describe('POST /api/auth/2fa/setup', () => {
    it('should initiate setup', async () => {
      const mockSetup = { secret: 'secret', qrCode: 'data:image...', backupCodes: ['code1'] };
      
      // Mock db user lookup
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue({ email: mockUser.email }),
      } as any);

      vi.mocked(totpService.setupTotp).mockResolvedValue(mockSetup);

      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .expect(200);

      expect(response.body).toEqual(mockSetup);
      expect(totpService.setupTotp).toHaveBeenCalledWith(mockUser.id, mockUser.email);
    });
  });

  describe('GET /api/auth/2fa/status', () => {
    it('should return enabled status', async () => {
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue({ totp_enabled: 1 }),
      } as any);

      const response = await request(app)
        .get('/api/auth/2fa/status')
        .expect(200);

      expect(response.body).toEqual({ enabled: true });
    });

    it('should return disabled status', async () => {
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue({ totp_enabled: 0 }),
      } as any);

      const response = await request(app)
        .get('/api/auth/2fa/status')
        .expect(200);

      expect(response.body).toEqual({ enabled: false });
    });
  });

  describe('POST /api/auth/2fa/verify', () => {
    it('should verify and enable 2FA', async () => {
      vi.mocked(totpService.verifyAndEnableTotp).mockReturnValue(true);

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ token: '123456' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(totpService.verifyAndEnableTotp).toHaveBeenCalledWith(mockUser.id, '123456');
    });

    it('should reject invalid verification token', async () => {
      vi.mocked(totpService.verifyAndEnableTotp).mockReturnValue(false);

      await request(app)
        .post('/api/auth/2fa/verify')
        .send({ token: 'wrong' })
        .expect(400);
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    it('should disable 2FA', async () => {
      const mockRun = vi.fn();
      vi.mocked(db.prepare).mockReturnValue({
        run: mockRun,
      } as any);

      await request(app)
        .post('/api/auth/2fa/disable')
        .expect(200);

      expect(mockRun).toHaveBeenCalledWith(mockUser.id);
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET totp_enabled = 0'));
    });
  });
});
