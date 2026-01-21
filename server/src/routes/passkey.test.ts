import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import passkeyRouter from './passkey.js';
import { authenticateToken } from '../middleware/auth.js';
import * as passkeyService from '../services/passkey.service.js';
import * as authService from '../services/auth.service.js';
import db from '../db.js';

// Mock dependencies
vi.mock('../middleware/auth.js');
vi.mock('../services/passkey.service.js');
vi.mock('../services/auth.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    })),
  },
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth/passkey', passkeyRouter);

describe('Passkey Routes', () => {
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

    // Mock db.prepare default behavior to avoid crashes
    vi.mocked(db.prepare).mockReturnValue({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    } as any);
  });

  describe('POST /api/auth/passkey/register/start', () => {
    it('should generate registration options', async () => {
      const mockOptions = { challenge: 'test-challenge', someOption: true };

      // Mock db user lookup
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue({ email: 'test@example.com' }),
      } as any);

      vi.mocked(passkeyService.generatePasskeyRegistrationOptions).mockResolvedValue(
        mockOptions as any
      );

      const response = await request(app).post('/api/auth/passkey/register/start').expect(200);

      expect(response.body).toEqual(mockOptions);
      expect(response.headers['set-cookie'][0]).toContain('passkey_challenge=test-challenge');
      expect(passkeyService.generatePasskeyRegistrationOptions).toHaveBeenCalledWith(
        mockUser.id,
        'test@example.com'
      );
    });

    it('should handle errors', async () => {
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue({ email: 'test@example.com' }),
      } as any);

      vi.mocked(passkeyService.generatePasskeyRegistrationOptions).mockRejectedValue(
        new Error('Failed options')
      );

      const response = await request(app).post('/api/auth/passkey/register/start').expect(500);

      expect(response.body.message).toBe('Failed options');
    });
  });

  describe('POST /api/auth/passkey/register/finish', () => {
    it('should verify registration', async () => {
      const mockVerification = { verified: true, id: 'new-passkey-id' };

      vi.mocked(passkeyService.verifyPasskeyRegistration).mockResolvedValue(
        mockVerification as any
      );

      const response = await request(app)
        .post('/api/auth/passkey/register/finish')
        .set('Cookie', ['passkey_challenge=test-challenge'])
        .send({ id: 'cred-id', response: {} })
        .expect(200);

      expect(response.body).toEqual(mockVerification);
      // Should clear cookie
      expect(response.headers['set-cookie'][0]).toContain('passkey_challenge=;');
      expect(passkeyService.verifyPasskeyRegistration).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ id: 'cred-id' }),
        'test-challenge'
      );
    });

    it('should fail without challenge cookie', async () => {
      const response = await request(app)
        .post('/api/auth/passkey/register/finish')
        .send({ id: 'cred-id' })
        .expect(400);

      expect(response.body.message).toBe('Challenge expired or missing');
    });
  });

  describe('POST /api/auth/passkey/login/start', () => {
    it('should generate login options for known user email', async () => {
      const mockOptions = { challenge: 'login-challenge' };

      // Mock db user lookup
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue({ id: 'user-123' }),
      } as any);

      vi.mocked(passkeyService.generatePasskeyLoginOptions).mockResolvedValue(mockOptions as any);

      const response = await request(app)
        .post('/api/auth/passkey/login/start')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toEqual(mockOptions);
      expect(response.headers['set-cookie'][0]).toContain('passkey_challenge=login-challenge');
      expect(passkeyService.generatePasskeyLoginOptions).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 if user not found by email', async () => {
      // Mock db user lookup returning null
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      // Since generatePasskeyLoginOptions is called with undefined userId,
      // but logic checks !userId && email -> 404
      vi.mocked(passkeyService.generatePasskeyLoginOptions).mockResolvedValue({
        challenge: 'any',
      } as any);

      await request(app)
        .post('/api/auth/passkey/login/start')
        .send({ email: 'unknown@example.com' })
        .expect(404);
    });
  });

  describe('POST /api/auth/passkey/login/finish', () => {
    it('should verify login and return tokens', async () => {
      const mockVerification = { verified: true };
      const mockAuthUser = { id: 'user-123', email: 'test@example.com', role: 'user' };

      // 1. Lookup user by email (first db call in login/finish if email provided)
      // 2. Lookup user details for token generation (last db call)
      const mockGet = vi
        .fn()
        .mockReturnValueOnce({ id: 'user-123' }) // Lookup by email
        .mockReturnValueOnce(mockAuthUser); // Lookup for token gen

      vi.mocked(db.prepare).mockReturnValue({
        get: mockGet,
        run: vi.fn(),
      } as any);

      vi.mocked(passkeyService.verifyPasskeyLogin).mockResolvedValue(mockVerification as any);
      vi.mocked(authService.generateToken).mockReturnValue('access-token');
      vi.mocked(authService.generateRefreshToken).mockReturnValue('refresh-token');

      const response = await request(app)
        .post('/api/auth/passkey/login/finish')
        .set('Cookie', ['passkey_challenge=login-challenge'])
        .send({ email: 'test@example.com', id: 'cred-id', response: {} })
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.accessToken).toBe('access-token');
      expect(response.body.user).toEqual(mockAuthUser);
      expect(passkeyService.verifyPasskeyLogin).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ id: 'cred-id' }),
        'login-challenge'
      );
    });

    it('should find user by credential id if email missing', async () => {
      const mockVerification = { verified: true };
      const mockAuthUser = { id: 'user-123', role: 'user' };

      // 1. Lookup user_id by credential_id
      // 2. Lookup user details
      const mockGet = vi
        .fn()
        .mockReturnValueOnce({ user_id: 'user-123' }) // Lookup by cred id
        .mockReturnValueOnce(mockAuthUser); // Lookup for token gen

      vi.mocked(db.prepare).mockReturnValue({
        get: mockGet,
        run: vi.fn(),
      } as any);

      vi.mocked(passkeyService.verifyPasskeyLogin).mockResolvedValue(mockVerification as any);
      vi.mocked(authService.generateToken).mockReturnValue('token');

      await request(app)
        .post('/api/auth/passkey/login/finish')
        .set('Cookie', ['passkey_challenge=login-challenge'])
        .send({ id: 'cred-id', response: {} }) // No email
        .expect(200);

      expect(passkeyService.verifyPasskeyLogin).toHaveBeenCalledWith(
        'user-123',
        expect.anything(),
        'login-challenge'
      );
    });
  });

  describe('GET /api/auth/passkey/list', () => {
    it('should return safe passkey list', async () => {
      const mockPasskeys = [
        {
          id: 'pk1',
          created_at: '2024-01-01',
          last_used_at: '2024-01-02',
          backup_status: 1,
          secret_data: 'hidden',
        },
      ];

      vi.mocked(passkeyService.getUserPasskeys).mockReturnValue(mockPasskeys as any);

      const response = await request(app).get('/api/auth/passkey/list').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        id: 'pk1',
        created_at: '2024-01-01',
        last_used_at: '2024-01-02',
        backup_status: true,
      });
      // Should filter out internal fields
      expect(response.body[0]).not.toHaveProperty('secret_data');
    });
  });

  describe('DELETE /api/auth/passkey/:id', () => {
    it('should delete passkey', async () => {
      vi.mocked(passkeyService.deletePasskey).mockReturnValue(true);

      await request(app).delete('/api/auth/passkey/pk1').expect(200).expect({ success: true });

      expect(passkeyService.deletePasskey).toHaveBeenCalledWith('pk1', mockUser.id);
    });

    it('should return 404 if passkey not found', async () => {
      vi.mocked(passkeyService.deletePasskey).mockReturnValue(false);

      await request(app).delete('/api/auth/passkey/pk1').expect(404);
    });
  });
});
