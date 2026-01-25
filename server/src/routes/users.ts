import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { searchUsers } from '../services/users.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

/**
 * GET /api/users/search
 * Search for users by name or email (only those who are discoverable)
 */
router.get(
  '/search',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.json([]);
        return;
      }

      const users = searchUsers(q);
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
