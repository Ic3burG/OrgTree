import express, { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { search, getAutocompleteSuggestions } from '../services/search.service.js';
import type { AuthRequest, JWTPayload } from '../types/index.js';

const router = express.Router();

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't reject if missing
 */
function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const decoded = jwt.verify(token, secret) as unknown as JWTPayload;
      (req as AuthRequest).user = decoded;
      console.error('[Search Debug] Auth success:', decoded.id);
    }
    next();
  } catch (err) {
    // Ignore invalid tokens for optional auth, just proceed as guest
    console.error('[Search Debug] Auth failed:', (err as Error).message);
    next();
  }
}

/**
 * GET /api/organizations/:orgId/search
 * Full-text search across departments and people
 */
router.get(
  '/organizations/:orgId/search',
  optionalAuthenticate,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { q, type = 'all', limit = '20', offset = '0', starred } = req.query;

      if (!q || (q as string).trim().length === 0) {
        res.status(400).json({ message: 'Search query (q) is required' });
        return;
      }

      const validTypes = ['all', 'departments', 'people'];
      if (!validTypes.includes(type as string)) {
        res.status(400).json({ message: 'Invalid type. Must be: all, departments, or people' });
        return;
      }

      const parsedLimit = Math.min(Math.max(1, parseInt(limit as string, 10) || 20), 100);
      const parsedOffset = Math.max(0, parseInt(offset as string, 10) || 0);
      const starredOnly = starred === 'true' || starred === '1';

      const results = await search(orgId!, req.user?.id, {
        query: (q as string).trim(),
        type: type as 'all' | 'departments' | 'people',
        limit: parsedLimit,
        offset: parsedOffset,
        starredOnly,
      });

      res.json(results);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 403 || error.status === 404) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/organizations/:orgId/search/autocomplete
 * Fast autocomplete suggestions for search
 */
router.get(
  '/organizations/:orgId/search/autocomplete',
  optionalAuthenticate,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { q, limit = '5' } = req.query;

      if (!q || (q as string).trim().length === 0) {
        res.json({ suggestions: [] });
        return;
      }

      const parsedLimit = Math.min(Math.max(1, parseInt(limit as string, 10) || 5), 10);

      const results = await getAutocompleteSuggestions(
        orgId!,
        req.user?.id,
        (q as string).trim(),
        parsedLimit
      );

      res.json(results);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 403 || error.status === 404) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      next(err);
    }
  }
);

export default router;
