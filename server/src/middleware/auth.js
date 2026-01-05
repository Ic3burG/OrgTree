import jwt from 'jsonwebtoken';
import { createAuditLog } from '../services/audit.service.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const ipAddress = req.ip || req.connection.remoteAddress;

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
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Security: Explicitly specify algorithm to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = decoded;
    next();
  } catch (err) {
    // Security: Log invalid/expired token attempt
    createAuditLog(
      null, // System-wide security event
      null, // Can't trust token data
      'invalid_token',
      'security',
      'authentication',
      {
        reason: err.name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token',
        ipAddress,
        path: req.path,
        error: err.message,
        timestamp: new Date().toISOString(),
      }
    );
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Role-based authorization middleware
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      // Security: Log permission denied - insufficient role
      const ipAddress = req.ip || req.connection.remoteAddress;
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
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

// Convenience middleware for common role checks
export const requireSuperuser = requireRole('superuser');
export const requireAdminOrAbove = requireRole('superuser', 'admin');
