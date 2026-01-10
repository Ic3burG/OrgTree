import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import csrfRouter from './csrf.js';
import * as csrfService from '../services/csrf.service.js';

// Mock dependencies
vi.mock('../services/csrf.service.js');

describe('CSRF Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', csrfRouter);

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

  describe('GET /api/csrf-token', () => {
    it('should generate and return a CSRF token', async () => {
      const mockToken = 'mock-signed-csrf-token-123';
      vi.mocked(csrfService.createCsrfTokenPair).mockReturnValue({
        signedToken: mockToken,
        token: 'raw-token',
      } as any);

      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body).toEqual({
        csrfToken: mockToken,
        expiresIn: 24 * 60 * 60 * 1000,
      });

      // Verify cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('csrf-token=' + mockToken);
      expect(cookies[0]).toContain('Path=/');
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should set httpOnly=false for cookie', async () => {
      const mockToken = 'test-token';
      vi.mocked(csrfService.createCsrfTokenPair).mockReturnValue({
        signedToken: mockToken,
        token: 'raw',
      } as any);

      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      // httpOnly flag should not be present (false)
      expect(cookies[0]).not.toContain('HttpOnly');
    });

    it('should set secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      vi.mocked(csrfService.createCsrfTokenPair).mockReturnValue({
        signedToken: 'token',
        token: 'raw',
      } as any);

      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle CSRF token generation errors', async () => {
      vi.mocked(csrfService.createCsrfTokenPair).mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const response = await request(app)
        .get('/api/csrf-token')
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to generate CSRF token',
        code: 'CSRF_GENERATION_ERROR',
      });
    });

    it('should work without authentication', async () => {
      vi.mocked(csrfService.createCsrfTokenPair).mockReturnValue({
        signedToken: 'public-token',
        token: 'raw',
      } as any);

      // No authorization header
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body.csrfToken).toBe('public-token');
    });
  });
});
