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

import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyTotp, setupTotp, verifyAndEnableTotp } from '../services/totp.service.js';
import {
  generateToken,
  generateRefreshToken,
  storeRefreshToken,
} from '../services/auth.service.js';
import db from '../db.js';
import type { DatabaseUser, AuthRequest } from '../types/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Security: Rate limit 2FA verification to prevent brute force attacks
const twoFAVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many verification attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

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
 * Security: Rate limited to 5 attempts per 15 minutes
 */
router.post('/verify-login', twoFAVerifyLimiter, async (req, res: Response): Promise<void> => {
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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
      | DatabaseUser
      | undefined;

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
      expiresIn: 86400, // 24 hours
    });
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * POST /api/auth/2fa/setup
 * Initialize 2FA setup for authenticated user
 * Returns secret, QR code, and backup codes
 */
router.post('/setup', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as
      | { email: string }
      | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const result = await setupTotp(userId, user.email);
    res.json(result);
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * GET /api/auth/2fa/status
 * Get current 2FA status for authenticated user
 */
router.get('/status', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(userId) as
      | { totp_enabled: number }
      | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ enabled: user.totp_enabled === 1 });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP token and enable 2FA for authenticated user
 * Security: Rate limited to 5 attempts per 15 minutes
 */
router.post(
  '/verify',
  twoFAVerifyLimiter,
  authenticateToken,
  (req: AuthRequest, res: Response): void => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      const success = verifyAndEnableTotp(userId, token);

      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid token', success: false });
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({ error: 'Failed to verify 2FA' });
    }
  }
);

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for authenticated user
 */
router.post('/disable', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Disable 2FA and clear secret
    db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

export default router;
