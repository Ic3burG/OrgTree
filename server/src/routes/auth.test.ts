import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import authRouter from './auth.js';
import * as authService from '../services/auth.service.js';
// import * as auditService from '../services/audit.service.js';

// Mock dependencies
vi.mock('../services/auth.service.js');
vi.mock('../services/audit.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
    })),
  },
}));

// Mock express-rate-limit to avoid rate limiting in tests
vi.mock('express-rate-limit', () => ({
  default: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

describe('Auth Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

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

  describe('POST /api/auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const mockResult = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      };

       
      vi.mocked(authService.createUser).mockResolvedValue(mockResult as any);

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(201);

      expect(response.body).toEqual({
        user: mockResult.user,
        accessToken: mockResult.accessToken,
        expiresIn: mockResult.expiresIn,
      });

      // Verify refresh token is set in cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      if (cookies) {
        expect(cookies[0]).toContain('refreshToken=mock-refresh-token');
        expect(cookies[0]).toContain('HttpOnly');
        expect(cookies[0]).toContain('Path=/api/auth');
      }

      // IP address from supertest will be ::ffff:127.0.0.1 (IPv6-mapped IPv4)
      // User agent will be undefined unless explicitly set
      expect(authService.createUser).toHaveBeenCalledWith(
        'Test User',
        'test@example.com',
        'SecurePassword123!',
        '::ffff:127.0.0.1',
        undefined
      );
    });

    it('should reject signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Name, email, and password are required',
      });
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should reject signup with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'short',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Password must be at least 12 characters',
      });
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      vi.mocked(authService.createUser).mockRejectedValue(new Error('Email already exists'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(500);

      expect(response.body).toEqual({
        message: 'Email already exists',
      });
    });

    // Note: Rate limiting tests are difficult with in-memory store
    // Consider testing rate limiting separately or with integration tests
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return tokens', async () => {
      const mockResult = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      };

       
      vi.mocked(authService.loginUser).mockResolvedValue(mockResult as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body).toEqual({
        user: mockResult.user,
        accessToken: mockResult.accessToken,
        expiresIn: mockResult.expiresIn,
      });

      // Verify refresh token is set in cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      if (cookies) {
        expect(cookies[0]).toContain('refreshToken=mock-refresh-token');
      }

      expect(authService.loginUser).toHaveBeenCalledWith(
        'test@example.com',
        'SecurePassword123!',
        '::ffff:127.0.0.1',
        undefined
      );
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it('should handle authentication failures', async () => {
      vi.mocked(authService.loginUser).mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(500);

      expect(response.body).toEqual({
        message: 'Invalid credentials',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
        createdAt: '2024-01-01',
      };

       
      vi.mocked(authService.getUserById).mockResolvedValue(mockUser as any);

      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(authService.getUserById).toHaveBeenCalledWith('1');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
      expect(authService.getUserById).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid or expired token',
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockResult = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user' as const,
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };

       
      vi.mocked(authService.rotateRefreshToken).mockReturnValue(mockResult as any);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=valid-refresh-token'])
        .expect(200);

      expect(response.body).toEqual({
        user: mockResult.user,
        accessToken: mockResult.accessToken,
        expiresIn: 900, // Hardcoded in route
      });

      // Verify new refresh token is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      if (cookies) {
        expect(cookies[0]).toContain('refreshToken=new-refresh-token');
      }

      expect(authService.rotateRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        expect.objectContaining({
          ipAddress: '::ffff:127.0.0.1',
          userAgent: undefined,
        })
      );
    });

    it('should reject refresh without refresh token cookie', async () => {
      const response = await request(app).post('/api/auth/refresh').expect(401);

      expect(response.body).toEqual({
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING',
      });
      expect(authService.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token', async () => {
      vi.mocked(authService.rotateRefreshToken).mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token'])
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke refresh token', async () => {
       
      vi.mocked(authService.revokeRefreshToken).mockResolvedValue(undefined as any);

      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', ['refreshToken=valid-refresh-token'])
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out successfully',
      });

      // Verify refresh token cookie is cleared (uses Expires header)
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      if (cookies) {
        expect(cookies[0]).toContain('refreshToken=;');
        expect(cookies[0]).toContain('Expires=');
      }

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should handle logout without refresh token', async () => {
       
      vi.mocked(authService.revokeRefreshToken).mockResolvedValue(undefined as any);

      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out successfully',
      });

      expect(authService.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/sessions', () => {
    it('should return user sessions when authenticated', async () => {
      const mockSessions = [
        {
          id: 'session1',
          deviceInfo: 'Chrome on Mac',
          ipAddress: '127.0.0.1',
          lastUsed: '2024-01-01',
          createdAt: '2024-01-01',
        },
        {
          id: 'session2',
          deviceInfo: 'Firefox on Windows',
          ipAddress: '192.168.1.1',
          lastUsed: '2024-01-02',
          createdAt: '2024-01-02',
        },
      ];

       
      vi.mocked(authService.getUserSessions).mockReturnValue(mockSessions as any);

      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // API returns { sessions: [...] } with isCurrent flag added
      expect(response.body).toHaveProperty('sessions');
      expect(response.body.sessions).toHaveLength(2);
      expect(response.body.sessions[0]).toHaveProperty('isCurrent', false);
      expect(authService.getUserSessions).toHaveBeenCalledWith('1');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/auth/sessions').expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });

  describe('DELETE /api/auth/sessions/:sessionId', () => {
    it('should revoke specific session', async () => {
      vi.mocked(authService.revokeSession).mockReturnValue(true);

      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete('/api/auth/sessions/session123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Session revoked successfully',
      });

      expect(authService.revokeSession).toHaveBeenCalledWith('session123', '1');
    });
  });

  describe('POST /api/auth/sessions/revoke-others', () => {
    it('should revoke all other sessions', async () => {
      vi.mocked(authService.revokeOtherSessions).mockReturnValue(3);

      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/sessions/revoke-others')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', ['refreshToken=current-session-token'])
        .expect(200);

      expect(response.body).toEqual({
        message: 'Revoked 3 other session(s)',
        revokedCount: 3,
      });

      expect(authService.revokeOtherSessions).toHaveBeenCalledWith('1', 'current-session-token');
    });

    it('should handle missing refresh token cookie', async () => {
      const token = jwt.sign(
        { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/sessions/revoke-others')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toEqual({
        message: 'No current session found',
      });
    });
  });
});
