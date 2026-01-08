import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { validateCsrf, validateCsrfIfAuthenticated } from './csrf.js';
import * as csrfService from '../services/csrf.service.js';
import * as auditService from '../services/audit.service.js';
import type { AuthRequest } from '../types/index.js';

// Mock dependencies
vi.mock('../services/csrf.service.js', () => ({
  verifyCsrfToken: vi.fn(),
  compareCsrfTokens: vi.fn(),
}));

vi.mock('../services/audit.service.js', () => ({
  createAuditLog: vi.fn(),
}));

describe('validateCsrf middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'POST',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {},
      cookies: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('safe HTTP methods', () => {
    it('should skip validation for GET requests', () => {
      mockReq.method = 'GET';

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(csrfService.verifyCsrfToken).not.toHaveBeenCalled();
    });

    it('should skip validation for HEAD requests', () => {
      mockReq.method = 'HEAD';

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip validation for OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('token presence validation', () => {
    it('should reject requests without header token', () => {
      mockReq.cookies = { 'csrf-token': 'cookie-token' };

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'CSRF token validation failed',
        code: 'CSRF_TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        null,
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.objectContaining({
          reason: 'missing_header_token',
          path: '/api/test',
          method: 'POST',
        })
      );
    });

    it('should reject requests without cookie token', () => {
      mockReq.headers = { 'x-csrf-token': 'header-token' };

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'CSRF token validation failed',
        code: 'CSRF_TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        null,
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.objectContaining({
          reason: 'missing_cookie_token',
        })
      );
    });

    it('should reject requests without both tokens', () => {
      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle header token as array (Express edge case)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.headers = { 'x-csrf-token': ['header-token'] as any };
      mockReq.cookies = { 'csrf-token': 'cookie-token' };
      vi.mocked(csrfService.verifyCsrfToken).mockReturnValue(true);
      vi.mocked(csrfService.compareCsrfTokens).mockReturnValue(true);

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(csrfService.verifyCsrfToken).toHaveBeenCalledWith('header-token');
    });
  });

  describe('token signature validation', () => {
    beforeEach(() => {
      mockReq.headers = { 'x-csrf-token': 'header-token' };
      mockReq.cookies = { 'csrf-token': 'cookie-token' };
    });

    it('should reject requests with invalid header token signature', () => {
      vi.mocked(csrfService.verifyCsrfToken).mockImplementation(token => {
        return token === 'cookie-token'; // Only cookie is valid
      });

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'CSRF token validation failed',
        code: 'CSRF_TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        null,
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.objectContaining({
          reason: 'invalid_header_signature',
        })
      );
    });

    it('should reject requests with invalid cookie token signature', () => {
      vi.mocked(csrfService.verifyCsrfToken).mockImplementation(token => {
        return token === 'header-token'; // Only header is valid
      });

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'CSRF token validation failed',
        code: 'CSRF_TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        null,
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.objectContaining({
          reason: 'invalid_cookie_signature',
        })
      );
    });
  });

  describe('token matching validation', () => {
    beforeEach(() => {
      mockReq.headers = { 'x-csrf-token': 'header-token' };
      mockReq.cookies = { 'csrf-token': 'cookie-token' };
      vi.mocked(csrfService.verifyCsrfToken).mockReturnValue(true);
    });

    it('should reject requests when tokens do not match', () => {
      vi.mocked(csrfService.compareCsrfTokens).mockReturnValue(false);

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'CSRF token validation failed',
        code: 'CSRF_TOKEN_MISMATCH',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        null,
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.objectContaining({
          reason: 'token_mismatch',
        })
      );
    });

    it('should accept requests when tokens match and are valid', () => {
      vi.mocked(csrfService.compareCsrfTokens).mockReturnValue(true);

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(auditService.createAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user context', () => {
    beforeEach(() => {
      mockReq.headers = { 'x-csrf-token': 'header-token' };
      mockReq.cookies = { 'csrf-token': 'cookie-token' };
      mockReq.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };
    });

    it('should include user information in audit log on failure', () => {
      vi.mocked(csrfService.verifyCsrfToken).mockReturnValue(false);

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        { id: '1', name: 'Test User', email: 'test@example.com' },
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.any(Object)
      );
    });
  });

  describe('IP address handling', () => {
    it('should handle missing IP address gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (mockReq as any).ip;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.connection = undefined as any;

      validateCsrf(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(auditService.createAuditLog).toHaveBeenCalledWith(
        null,
        null,
        'csrf_validation_failed',
        'security',
        'csrf_protection',
        expect.objectContaining({
          ipAddress: undefined,
        })
      );
    });
  });
});

describe('validateCsrfIfAuthenticated middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'POST',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {},
      cookies: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should skip validation for unauthenticated requests', () => {
    // No req.user set
    validateCsrfIfAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(csrfService.verifyCsrfToken).not.toHaveBeenCalled();
  });

  it('should validate CSRF for authenticated requests', () => {
    mockReq.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    validateCsrfIfAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

    // Should fail because no tokens provided
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should pass through safe methods even when authenticated', () => {
    mockReq.method = 'GET';
    mockReq.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    validateCsrfIfAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should fully validate authenticated requests with tokens', () => {
    mockReq.user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };
    mockReq.headers = { 'x-csrf-token': 'header-token' };
    mockReq.cookies = { 'csrf-token': 'cookie-token' };
    vi.mocked(csrfService.verifyCsrfToken).mockReturnValue(true);
    vi.mocked(csrfService.compareCsrfTokens).mockReturnValue(true);

    validateCsrfIfAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
