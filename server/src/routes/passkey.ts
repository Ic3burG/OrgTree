import express from 'express';
import type { Response } from 'express';
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyLoginOptions,
  verifyPasskeyLogin,
  getUserPasskeys,
  deletePasskey,
} from '../services/passkey.service.js';
import db from '../db.js';
import { generateToken, storeRefreshToken, generateRefreshToken } from '../services/auth.service.js';
import type { DatabaseUser, AuthRequest } from '../types/index.js';

const router = express.Router();

// Helper to extract error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return getErrorMessage(error);
  return String(error);
}

// Register Start
router.post('/register/start', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string };
    const options = await generatePasskeyRegistrationOptions(userId, user.email);
    return res.json(options);
  } catch (error: unknown) {
    console.error('Passkey register start error:', error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
});

// Register Finish
router.post('/register/finish', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await verifyPasskeyRegistration(userId, req.body);
    if (result.verified) {
      return res.json({ success: true, id: result.id });
    } else {
      return res.status(400).json({ success: false, message: 'Verification failed' });
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
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
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
           const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
           userId = user?.id;
       } else {
           // Look up by credential ID
           const passkey = db.prepare('SELECT user_id FROM passkeys WHERE credential_id = ?').get(body.id) as { user_id: string } | undefined;
           userId = passkey?.user_id;
       }
    }

    if (!userId) {
        return res.status(400).json({ message: 'User context could not be determined' });
    }
    
    const verification = await verifyPasskeyLogin(userId, body);

    if (verification.verified) {
        // Log the user in
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DatabaseUser;
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken();
        
        // Store refresh token
        storeRefreshToken(user.id, refreshToken, {
             ipAddress: req.ip,
             userAgent: req.headers['user-agent']
        });

        return res.json({
            verified: true,
            user,
            accessToken,
            refreshToken,
            expiresIn: 900
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
router.get('/list', (req: AuthRequest, res: Response) => {
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
            created_at: pk.created_at,
            last_used_at: pk.last_used_at,
            backup_status: !!pk.backup_status
        }));
        
        return res.json(safePasskeys);
    } catch (error: unknown) {
        return res.status(500).json({ message: getErrorMessage(error) });
    }
});

// Delete Passkey
router.delete('/:id', (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const success = deletePasskey(req.params.id, userId);
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
