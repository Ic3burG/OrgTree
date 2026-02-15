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

import express from 'express';
import type { Response } from 'express';
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyLoginOptions,
  verifyPasskeyLogin,
  getUserPasskeys,
  deletePasskey,
  renamePasskey,
  MAX_PASSKEYS,
} from '../services/passkey.service.js';
import db from '../db.js';
import {
  generateToken,
  storeRefreshToken,
  generateRefreshToken,
} from '../services/auth.service.js';
import type { DatabaseUser, AuthRequest } from '../types/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to extract error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Cookie options for passkey challenge (short lived)
const CHALLENGE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 5 * 60 * 1000, // 5 minutes
  path: '/api/auth/passkey', // Scope to passkey routes
};

// Start Register
router.post('/register/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existingPasskeys = getUserPasskeys(userId);
    const remainingSlots = MAX_PASSKEYS - existingPasskeys.length;

    if (remainingSlots <= 0) {
      return res
        .status(400)
        .json({ message: `Maximum of ${MAX_PASSKEYS} passkeys allowed per user` });
    }

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as {
      email: string;
    };
    const options = await generatePasskeyRegistrationOptions(userId, user.email);

    // Store challenge in cookie
    res.cookie('passkey_challenge', options.challenge, CHALLENGE_COOKIE_OPTIONS);

    return res.json({ ...options, remainingSlots });
  } catch (error: unknown) {
    console.error('Passkey register start error:', error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// Register Finish
router.post('/register/finish', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const challenge = req.cookies.passkey_challenge;
    if (!challenge) {
      return res.status(400).json({ message: 'Challenge expired or missing' });
    }

    const { name, ...registrationBody } = req.body;
    const result = await verifyPasskeyRegistration(userId, registrationBody, challenge, name);

    // Clear challenge cookie
    res.clearCookie('passkey_challenge', { path: '/api/auth/passkey' });

    if (result.verified) {
      return res.json({ verified: true, id: result.id });
    } else {
      return res.status(400).json({ verified: false, message: 'Verification failed' });
    }
  } catch (error: unknown) {
    console.error('Passkey register finish error:', error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// Login Start
router.post('/login/start', async (req, res) => {
  try {
    const { email } = req.body;
    let userId: string | undefined;

    if (email) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
        | { id: string }
        | undefined;
      userId = user?.id;
    }

    const options = await generatePasskeyLoginOptions(userId);

    // If we have a userId, we're doing a targeted login.
    // If not, we might be doing conditional UI.
    // The challenge is stored in memory keyed by userId in the service.
    // If userId is undefined, our simple service implementation might NOT store the challenge efficiently.
    // For this implementation, we require identifying the user first (via email) or having them authenticated already (for adding keys).
    // But login implies not authenticated.
    // The service implementation used `if (userId) userChallenges.set...`
    // So if no userId, challenge isn't stored. This needs fixing for "user-nameless" auth if we supported it.
    // For now we assume email is provided or we fetch it.

    if (!userId && email) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Store challenge in cookie
    res.cookie('passkey_challenge', options.challenge, CHALLENGE_COOKIE_OPTIONS);

    return res.json(options);
  } catch (error: unknown) {
    console.error('Passkey login start error:', error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// Login Finish
router.post('/login/finish', async (req: AuthRequest, res: Response) => {
  try {
    const { email, ...body } = req.body; // Authenticator response

    // We need to find the user ID to retrieve the challenge AND check the passkey.
    // Usually the response contains the credential ID, which maps to a user.
    // Our service `verifyPasskeyLogin` takes `userId`.
    // We can look up the user by credential ID first.

    let userId = req.user?.id;

    if (!userId) {
      if (email) {
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
          | { id: string }
          | undefined;
        userId = user?.id;
      } else {
        // Look up by credential ID
        const passkey = db
          .prepare('SELECT user_id FROM passkeys WHERE credential_id = ?')
          .get(body.id) as { user_id: string } | undefined;
        userId = passkey?.user_id;
      }
    }

    if (!userId) {
      return res.status(400).json({ message: 'User context could not be determined' });
    }

    const challenge = req.cookies.passkey_challenge;
    if (!challenge) {
      return res.status(400).json({ message: 'Challenge expired or missing' });
    }

    const verification = await verifyPasskeyLogin(userId, body, challenge);

    // Clear challenge cookie
    res.clearCookie('passkey_challenge', { path: '/api/auth/passkey' });

    if (verification.verified) {
      // Log the user in
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DatabaseUser;
      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token
      storeRefreshToken(user.id, refreshToken, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        verified: true,
        user,
        accessToken,
        refreshToken,
        expiresIn: 86400,
      });
    } else {
      return res.status(400).json({ verified: false, message: 'Verification failed' });
    }
  } catch (error: unknown) {
    console.error('Passkey login finish error:', error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// List Passkeys
router.get('/list', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const passkeys = getUserPasskeys(userId);
    // Don't return public keys or other sensitive/binary internal data if not needed
    // Just return metadata
    const safePasskeys = passkeys.map(pk => ({
      id: pk.id,
      name: pk.name || 'Passkey',
      created_at: pk.created_at,
      last_used_at: pk.last_used_at,
      backup_status: !!pk.backup_status,
    }));

    return res.json(safePasskeys);
  } catch (error: unknown) {
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// Rename Passkey
router.patch('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const passkeyId = req.params.id;
    if (!passkeyId) {
      return res.status(400).json({ message: 'Passkey ID required' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ message: 'Name must be 50 characters or less' });
    }

    const success = renamePasskey(passkeyId, userId, name.trim());
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: 'Passkey not found' });
    }
  } catch (error: unknown) {
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// Delete Passkey
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const passkeyId = req.params.id;
    if (!passkeyId) {
      return res.status(400).json({ message: 'Passkey ID required' });
    }

    const success = deletePasskey(passkeyId, userId);
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: 'Passkey not found' });
    }
  } catch (error: unknown) {
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

export default router;
