import express, { Response, NextFunction, Request } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import {
  createUser,
  loginUser,
  getUserById,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserSessions,
  revokeSession,
  revokeOtherSessions,
  validateRefreshToken,
} from '../services/auth.service.js';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// Cookie options for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/', // Accessible across the app
};

// Rate limiter for authentication endpoints - prevents brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // relaxed for dev seeding
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    // Security: Log rate limit violation
    const ipAddress = req.ip || req.connection.remoteAddress;
    createAuditLog(
      null, // System-wide security event
      null, // No user information
      'rate_limit_exceeded',
      'security',
      'rate_limiting',
      {
        endpoint: req.path,
        method: req.method,
        ipAddress,
        limit: 5,
        windowMs: 15 * 60 * 1000,
        timestamp: new Date().toISOString(),
      }
    );
    res.status(429).json({ message: 'Too many login attempts, please try again later' });
  },
});

// POST /api/auth/signup
router.post(
  '/signup',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        res.status(400).json({ message: 'Name, email, and password are required' });
        return;
      }

      // Security: Enforce stronger password requirements
      if (password.length < 12) {
        res.status(400).json({ message: 'Password must be at least 12 characters' });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await createUser(name, email, password, ipAddress, userAgent);

      // Clear legacy cookie path if exists
      res.clearCookie('refreshToken', { path: '/api/auth' });

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      // Return access token and user (not refresh token in body)
      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await loginUser(email, password, ipAddress, userAgent);

      // Clear legacy cookie path if exists
      res.clearCookie('refreshToken', { path: '/api/auth' });

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      // Return access token and user (not refresh token in body)
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        requiresTwoFactor: result.requiresTwoFactor,
        tempUserId: result.tempUserId,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get(
  '/me',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await getUserById(req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/auth/profile
 * Update current user's profile information
 */
router.put(
  '/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, is_discoverable } = req.body;

      if (name === undefined && email === undefined && is_discoverable === undefined) {
        res
          .status(400)
          .json({ message: 'At least one field (name, email, or is_discoverable) is required' });
        return;
      }

      // Check for superuser route to reuse updateUser or import it
      const { updateUser: updateUserService } = await import('../services/users.service.js');
      const updatedUser = updateUserService(req.user!.id, { name, email, is_discoverable });

      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/change-password - Change password (requires auth)
router.post(
  '/change-password',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { oldPassword, newPassword } = req.body;

      // Get current user from database
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as
        | { password_hash: string; must_change_password: number }
        | undefined;
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Security: Require old password verification UNLESS user must change password
      // (temporary password flow allows change without knowing old password)
      if (!user.must_change_password) {
        if (!oldPassword) {
          res.status(400).json({ message: 'Current password is required' });
          return;
        }

        // Verify old password
        const isValidOldPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isValidOldPassword) {
          res.status(401).json({ message: 'Current password is incorrect' });
          return;
        }
      }

      if (!newPassword) {
        res.status(400).json({ message: 'New password is required' });
        return;
      }

      // Security: Enforce stronger password requirements
      if (newPassword.length < 12) {
        res.status(400).json({ message: 'Password must be at least 12 characters' });
        return;
      }

      // Security: Prevent reusing the same password
      if (oldPassword && oldPassword === newPassword) {
        res.status(400).json({ message: 'New password must be different from current password' });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const now = new Date().toISOString();

      // Update password and clear must_change_password flag
      const result = db
        .prepare(
          `
      UPDATE users
      SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE id = ?
    `
        )
        .run(passwordHash, now, req.user!.id);

      if (result.changes === 0) {
        res.status(500).json({ message: 'Failed to update password' });
        return;
      }

      // Security: Revoke all refresh tokens (force re-login on all devices)
      const revokedCount = revokeAllUserTokens(req.user!.id);

      // Clear the refresh token cookie (both paths)
      res.clearCookie('refreshToken', { path: REFRESH_COOKIE_OPTIONS.path });
      res.clearCookie('refreshToken', { path: '/api/auth' });

      // Return updated user info
      const updatedUser = await getUserById(req.user!.id);
      res.json({
        message: 'Password changed successfully. Please log in again.',
        user: updatedUser,
        sessionsRevoked: revokedCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================
// REFRESH TOKEN ENDPOINTS
// ============================================

// Rate limiter for refresh endpoint - more permissive than login
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { message: 'Too many refresh attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/refresh - Get new access token using refresh token
router.post(
  '/refresh',
  refreshLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get refresh token from httpOnly cookie
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          message: 'Refresh token required',
          code: 'REFRESH_TOKEN_MISSING',
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = rotateRefreshToken(refreshToken, { ipAddress, userAgent });

      if (!result) {
        // Clear invalid cookie (both paths)
        res.clearCookie('refreshToken', { path: REFRESH_COOKIE_OPTIONS.path });
        res.clearCookie('refreshToken', { path: '/api/auth' });

        // Log potential token reuse attack
        createAuditLog(null, null, 'refresh_token_invalid', 'security', 'authentication', {
          reason: 'invalid_or_expired_refresh_token',
          ipAddress,
          timestamp: new Date().toISOString(),
        });

        res.status(401).json({
          message: 'Invalid or expired refresh token',
          code: 'REFRESH_TOKEN_INVALID',
        });
        return;
      }

      // Clear legacy cookie path if exists
      res.clearCookie('refreshToken', { path: '/api/auth' });
      // Set new refresh token cookie
      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

      res.json({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: 86400, // 24 hours in seconds
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout - Revoke refresh token and clear cookie
router.post('/logout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      revokeRefreshToken(refreshToken);
    }

    // Clear the cookie (both paths)
    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_OPTIONS.path });
    res.clearCookie('refreshToken', { path: '/api/auth' });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================

// GET /api/auth/sessions - List all active sessions for current user
router.get(
  '/sessions',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = getUserSessions(req.user!.id);
      const currentRefreshToken = req.cookies.refreshToken;
      let currentSessionId: string | null = null;

      if (currentRefreshToken) {
        // Identify current session from refresh token
        // validateRefreshToken also updates last_used_at
        const tokenData = validateRefreshToken(currentRefreshToken);
        if (tokenData) {
          currentSessionId = tokenData.tokenId;
        }
      }

      // Mark current session
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        is_current: session.id === currentSessionId,
      }));

      res.json({ sessions: sessionsWithCurrent });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/auth/sessions/:sessionId - Revoke a specific session
router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.sessionId;
      if (!sessionId) {
        res.status(400).json({ message: 'Session ID is required' });
        return;
      }

      const revoked = revokeSession(sessionId, req.user!.id);

      if (!revoked) {
        res.status(404).json({ message: 'Session not found' });
        return;
      }

      res.json({ message: 'Session revoked successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/sessions/revoke-others - Revoke all sessions except current
router.post(
  '/sessions/revoke-others',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentToken = req.cookies.refreshToken as string | undefined;

      if (!currentToken) {
        console.error(
          'Revoke others failed: No refresh token cookie. Cookies received:',
          Object.keys(req.cookies)
        );
        res.status(400).json({ message: 'No current session found' });
        return;
      }

      const revokedCount = revokeOtherSessions(req.user!.id, currentToken);

      res.json({
        message: `Revoked ${revokedCount} other session(s)`,
        revokedCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
