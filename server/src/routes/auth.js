import express from 'express';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
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
} from '../services/auth.service.js';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.service.js';

const router = express.Router();

// Cookie parser for refresh tokens
router.use(cookieParser());

// Cookie options for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth', // Only sent to auth endpoints
};

// Rate limiter for authentication endpoints - prevents brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
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
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Security: Enforce stronger password requirements
    if (password.length < 12) {
      return res.status(400).json({ message: 'Password must be at least 12 characters' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await createUser(name, email, password, ipAddress, userAgent);

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
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await loginUser(email, password, ipAddress, userAgent);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Return access token and user (not refresh token in body)
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password - Change password (requires auth)
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Get current user from database
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Security: Require old password verification UNLESS user must change password
    // (temporary password flow allows change without knowing old password)
    if (!user.must_change_password) {
      if (!oldPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      // Verify old password
      const isValidOldPassword = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValidOldPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    // Security: Enforce stronger password requirements
    if (newPassword.length < 12) {
      return res.status(400).json({ message: 'Password must be at least 12 characters' });
    }

    // Security: Prevent reusing the same password
    if (oldPassword && oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: 'New password must be different from current password' });
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
      .run(passwordHash, now, req.user.id);

    if (result.changes === 0) {
      return res.status(500).json({ message: 'Failed to update password' });
    }

    // Security: Revoke all refresh tokens (force re-login on all devices)
    const revokedCount = revokeAllUserTokens(req.user.id);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth' });

    // Return updated user info
    const updatedUser = await getUserById(req.user.id);
    res.json({
      message: 'Password changed successfully. Please log in again.',
      user: updatedUser,
      sessionsRevoked: revokedCount,
    });
  } catch (err) {
    next(err);
  }
});

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
router.post('/refresh', refreshLimiter, async (req, res, next) => {
  try {
    // Get refresh token from httpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING',
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = rotateRefreshToken(refreshToken, { ipAddress, userAgent });

    if (!result) {
      // Clear invalid cookie
      res.clearCookie('refreshToken', { path: '/api/auth' });

      // Log potential token reuse attack
      createAuditLog(null, null, 'refresh_token_invalid', 'security', 'authentication', {
        reason: 'invalid_or_expired_refresh_token',
        ipAddress,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        message: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Set new refresh token cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - Revoke refresh token and clear cookie
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      revokeRefreshToken(refreshToken);
    }

    // Clear the cookie
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
router.get('/sessions', authenticateToken, async (req, res, next) => {
  try {
    const sessions = getUserSessions(req.user.id);

    // Mark current session
    const currentToken = req.cookies.refreshToken;
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: false, // We can't easily determine this without storing the hash
    }));

    res.json({ sessions: sessionsWithCurrent });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/sessions/:sessionId - Revoke a specific session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const revoked = revokeSession(sessionId, req.user.id);

    if (!revoked) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ message: 'Session revoked successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/sessions/revoke-others - Revoke all sessions except current
router.post('/sessions/revoke-others', authenticateToken, async (req, res, next) => {
  try {
    const currentToken = req.cookies.refreshToken;

    if (!currentToken) {
      return res.status(400).json({ message: 'No current session found' });
    }

    const revokedCount = revokeOtherSessions(req.user.id, currentToken);

    res.json({
      message: `Revoked ${revokedCount} other session(s)`,
      revokedCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
