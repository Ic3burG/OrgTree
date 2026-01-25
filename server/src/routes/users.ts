import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  createAdminUser,
  searchUsers,
} from '../services/users.service.js';
import { createAuditLog } from '../services/audit.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// Rate limiter for password reset - prevents abuse
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 password resets per windowMs
  message: { message: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    // Security: Log rate limit violation
    const ipAddress = req.ip || (req.socket?.remoteAddress ?? '');
    createAuditLog(
      null, // System-wide security event
      (req as AuthRequest).user
        ? {
            id: (req as AuthRequest).user!.id,
            name: (req as AuthRequest).user!.name,
            email: (req as AuthRequest).user!.email,
          }
        : null,
      'rate_limit_exceeded',
      'security',
      'rate_limiting',
      {
        endpoint: req.path,
        method: req.method,
        ipAddress,
        limit: 10,
        windowMs: 15 * 60 * 1000,
        timestamp: new Date().toISOString(),
      }
    );
    res.status(429).json({ message: 'Too many password reset attempts, please try again later' });
  },
});

// Rate limiter for sensitive admin operations - prevents abuse of privileged endpoints
const adminOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 admin operations per windowMs
  message: { message: 'Too many admin operations, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    // Security: Log rate limit violation
    const ipAddress = req.ip || (req.socket?.remoteAddress ?? '');
    createAuditLog(
      null, // System-wide security event
      (req as AuthRequest).user
        ? {
            id: (req as AuthRequest).user!.id,
            name: (req as AuthRequest).user!.name,
            email: (req as AuthRequest).user!.email,
          }
        : null,
      'rate_limit_exceeded',
      'security',
      'rate_limiting',
      {
        endpoint: req.path,
        method: req.method,
        ipAddress,
        limit: 50,
        windowMs: 15 * 60 * 1000,
        timestamp: new Date().toISOString(),
      }
    );
    res.status(429).json({ message: 'Too many admin operations, please try again later' });
  },
});

// Search route - requires authentication but NOT superuser role
router.get(
  '/users/search',
  authenticateToken,
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.json([]);
        return;
      }

      const users = searchUsers(q);
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);

// All other user management routes require authentication and superuser role
// Restrict middleware to /users path to prevent blocking other routes mounted at /api
router.use('/users', authenticateToken);
router.use('/users', requireSuperuser);

// POST /api/users - Create new user
router.post(
  '/users',
  adminOperationsLimiter,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, role } = req.body;

      if (!name || !email || !role) {
        res.status(400).json({ message: 'Name, email, and role are required' });
        return;
      }

      const result = await createAdminUser(name, email, role);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users - List all users
router.get('/users', (_req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const users = getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Get single user
router.get('/users/:id', (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = getUserById(req.params.id!);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update user details
router.put('/users/:id', (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      res.status(400).json({ message: 'At least one field (name or email) is required' });
      return;
    }

    const user = updateUser(req.params.id!, { name, email });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/role - Change user role
router.put(
  '/users/:id/role',
  adminOperationsLimiter,
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ message: 'Role is required' });
        return;
      }

      const user = updateUserRole(req.params.id!, role, req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/users/:id/reset-password - Reset user password
router.post(
  '/users/:id/reset-password',
  passwordResetLimiter,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await resetUserPassword(req.params.id!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/users/:id - Delete user
router.delete(
  '/users/:id',
  adminOperationsLimiter,
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      deleteUser(req.params.id!, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
