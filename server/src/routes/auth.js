import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { createUser, loginUser, getUserById } from '../services/auth.service.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
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
router.post('/login', async (req, res, next) => {
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

// DEV ONLY: Reset password without email verification
// WARNING: Remove or secure this endpoint before production!
router.post('/dev-reset-password', async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    // Validation
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and newPassword are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE email = ?
    `).run(passwordHash, email);

    res.json({
      message: 'Password reset successful',
      email
    });
  } catch (err) {
    next(err);
  }
});

export default router;
