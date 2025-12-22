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
  trustProxy: true, // Trust X-Forwarded-For header from Render proxy
});

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
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
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    // Update password and clear must_change_password flag
    db.prepare(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, req.user.id);

    // Return updated user info
    const user = await getUserById(req.user.id);
    res.json({ message: 'Password changed successfully', user });
  } catch (err) {
    next(err);
  }
});

export default router;
