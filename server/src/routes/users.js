import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser
} from '../services/users.service.js';

const router = express.Router();

// Rate limiter for password reset - prevents abuse
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 password resets per windowMs
  message: { message: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust X-Forwarded-For header from Render proxy
});

// All user management routes require authentication and superuser role
router.use(authenticateToken);
router.use(requireSuperuser);

// GET /api/users - List all users
router.get('/users', (req, res, next) => {
  try {
    const users = getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Get single user
router.get('/users/:id', (req, res, next) => {
  try {
    const user = getUserById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update user details
router.put('/users/:id', (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ message: 'At least one field (name or email) is required' });
    }

    const user = updateUser(req.params.id, { name, email });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/role - Change user role
router.put('/users/:id/role', (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const user = updateUserRole(req.params.id, role, req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const result = await resetUserPassword(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/users/:id', (req, res, next) => {
  try {
    deleteUser(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
