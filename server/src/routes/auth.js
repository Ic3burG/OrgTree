import express from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { createUser, loginUser, getUserById } from '../services/auth.service.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for authentication endpoints - prevents brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
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

    const result = await createUser(name, email, password);
    res.status(201).json(result);
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

    const result = await loginUser(email, password);
    res.json(result);
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
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    // Update password and clear must_change_password flag
    const result = db.prepare(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, req.user.id);

    if (result.changes === 0) {
      return res.status(500).json({ message: 'Failed to update password' });
    }

    // Return updated user info
    const updatedUser = await getUserById(req.user.id);
    res.json({ message: 'Password changed successfully', user: updatedUser });
  } catch (err) {
    next(err);
  }
});

export default router;
