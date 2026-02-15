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

import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { createAuditLog } from '../services/audit.service.js';
import type { AuthRequest, JWTPayload } from '../types/index.js';

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const ipAddress = req.ip || req.connection?.remoteAddress;

  if (!token) {
    // Security: Log missing token attempt
    createAuditLog(
      null, // System-wide security event
      null, // No user information
      'invalid_token',
      'security',
      'authentication',
      {
        reason: 'missing_token',
        ipAddress,
        path: req.path,
        timestamp: new Date().toISOString(),
      }
    );
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    // Security: Explicitly specify algorithm to prevent algorithm confusion attacks
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    const decoded = jwt.verify(token, secret) as unknown as JWTPayload;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    // Security: Log invalid/expired token attempt
    createAuditLog(
      null, // System-wide security event
      null, // Can't trust token data
      'invalid_token',
      'security',
      'authentication',
      {
        reason: (err as Error).name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token',
        ipAddress,
        path: req.path,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }
    );
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: Array<'user' | 'admin' | 'superuser'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      // Security: Log permission denied - insufficient role
      const ipAddress = req.ip || req.connection?.remoteAddress;
      createAuditLog(
        null, // System-wide security event
        { id: req.user.id, name: req.user.name, email: req.user.email },
        'permission_denied',
        'security',
        'authorization',
        {
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          path: req.path,
          method: req.method,
          ipAddress,
          timestamp: new Date().toISOString(),
        }
      );
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

// Convenience middleware for common role checks
export const requireSuperuser = requireRole('superuser');
export const requireAdminOrAbove = requireRole('superuser', 'admin');
