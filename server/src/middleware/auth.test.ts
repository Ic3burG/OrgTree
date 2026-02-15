/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { authenticateToken, requireRole, requireSuperuser, requireAdminOrAbove } from './auth.js';
import * as auditService from '../services/audit.service.js';
import type { AuthRequest, JWTPayload } from '../types/index.js';

// Mock dependencies
vi.mock('../services/audit.service.js', () => ({
  createAuditLog: vi.fn(),
}));

describe('authenticateToken middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      path: '/api/test',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('should reject requests without authorization header', () => {
    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
    expect(auditService.createAuditLog).toHaveBeenCalledWith(
      null,
      null,
      'invalid_token',
      'security',
      'authentication',
      expect.objectContaining({
        reason: 'missing_token',
        ipAddress: '127.0.0.1',
        path: '/api/test',
      })
    );
  });

  it('should reject requests with malformed authorization header', () => {
    mockReq.headers = { authorization: 'InvalidFormat' };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid JWT token', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
    expect(auditService.createAuditLog).toHaveBeenCalledWith(
      null,
      null,
      'invalid_token',
      'security',
      'authentication',
      expect.objectContaining({
        reason: 'invalid_token',
        ipAddress: '127.0.0.1',
        path: '/api/test',
      })
    );
  });

  it('should reject requests with expired JWT token', () => {
    const expiredToken = jwt.sign(
      { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
      'test-secret-key',
      { expiresIn: '-1h' } // Expired 1 hour ago
    );
    mockReq.headers = { authorization: `Bearer ${expiredToken}` };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
    expect(auditService.createAuditLog).toHaveBeenCalledWith(
      null,
      null,
      'invalid_token',
      'security',
      'authentication',
      expect.objectContaining({
        reason: 'expired_token',
      })
    );
  });

  it('should accept valid JWT token and attach user to request', () => {
    const payload: JWTPayload = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };
    const validToken = jwt.sign(payload, 'test-secret-key', { expiresIn: '1h' });
    mockReq.headers = { authorization: `Bearer ${validToken}` };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toMatchObject({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    });
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(auditService.createAuditLog).not.toHaveBeenCalled();
  });

  it('should handle missing JWT_SECRET environment variable', () => {
    delete process.env.JWT_SECRET;
    const validToken = jwt.sign({ id: '1' }, 'any-secret', { expiresIn: '1h' });
    mockReq.headers = { authorization: `Bearer ${validToken}` };

    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle requests without IP address gracefully', () => {
    delete (mockReq as any).ip;

    mockReq.connection = undefined as any;

    authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(auditService.createAuditLog).toHaveBeenCalledWith(
      null,
      null,
      'invalid_token',
      'security',
      'authentication',
      expect.objectContaining({
        ipAddress: undefined,
      })
    );
  });
});

describe('requireRole middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      ip: '127.0.0.1',
      path: '/api/admin/test',
      method: 'POST',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should reject requests without authenticated user', () => {
    const middleware = requireRole('admin');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject requests when user role is not in allowed roles', () => {
    mockReq.user = {
      id: '1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
    };

    const middleware = requireRole('admin', 'superuser');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
    expect(mockNext).not.toHaveBeenCalled();
    expect(auditService.createAuditLog).toHaveBeenCalledWith(
      null,
      { id: '1', name: 'Regular User', email: 'user@example.com' },
      'permission_denied',
      'security',
      'authorization',
      expect.objectContaining({
        requiredRoles: ['admin', 'superuser'],
        userRole: 'user',
        path: '/api/admin/test',
        method: 'POST',
      })
    );
  });

  it('should accept requests when user has required role', () => {
    mockReq.user = {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    };

    const middleware = requireRole('admin', 'superuser');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(auditService.createAuditLog).not.toHaveBeenCalled();
  });

  it('should require explicit role permission (no automatic role hierarchy)', () => {
    mockReq.user = {
      id: '1',
      email: 'superuser@example.com',
      name: 'Super User',
      role: 'superuser',
    };

    // Middleware requires explicit role listing - no automatic hierarchy
    const middleware = requireRole('admin');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should accept user role when explicitly allowed', () => {
    mockReq.user = {
      id: '1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
    };

    const middleware = requireRole('user');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('requireSuperuser middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { ip: '127.0.0.1', path: '/api/superuser', method: 'GET' };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should only accept superuser role', () => {
    mockReq.user = {
      id: '1',
      email: 'superuser@example.com',
      name: 'Super User',
      role: 'superuser',
    };

    requireSuperuser(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should reject admin role', () => {
    mockReq.user = {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    };

    requireSuperuser(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('requireAdminOrAbove middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { ip: '127.0.0.1', path: '/api/admin', method: 'GET' };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should accept superuser role', () => {
    mockReq.user = {
      id: '1',
      email: 'superuser@example.com',
      name: 'Super User',
      role: 'superuser',
    };

    requireAdminOrAbove(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should accept admin role', () => {
    mockReq.user = {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    };

    requireAdminOrAbove(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should reject regular user role', () => {
    mockReq.user = {
      id: '1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
    };

    requireAdminOrAbove(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
