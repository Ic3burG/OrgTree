import { Router, type Response } from 'express';
import { verifyTotp } from '../services/totp.service.js';
import { generateToken, generateRefreshToken, storeRefreshToken } from '../services/auth.service.js';
import db from '../db.js';
import type { DatabaseUser } from '../types/index.js';

const router = Router();

// Cookie options for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

/**
 * POST /api/auth/2fa/verify-login
 * Verify TOTP code and complete login
 */
router.post('/verify-login', async (req, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      res.status(400).json({ error: 'User ID and token are required' });
      return;
    }

    // Verify TOTP token
    const isValid = verifyTotp(userId, token);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DatabaseUser | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken();

    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    storeRefreshToken(user.id, refreshToken, { ipAddress, userAgent });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      expiresIn: 900, // 15 minutes
    });
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

export default router;
