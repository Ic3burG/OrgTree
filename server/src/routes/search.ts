import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { search, getAutocompleteSuggestions } from '../services/search.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/organizations/:orgId/search
 * Full-text search across departments and people
 *
 * Query Parameters:
 * - q: Search query (required, min 1 char)
 * - type: Filter type - 'all' | 'departments' | 'people' (default: 'all')
 * - limit: Max results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get('/organizations/:orgId/search', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { q, type = 'all', limit = '20', offset = '0' } = req.query;

    // Validate query
    if (!q || (q as string).trim().length === 0) {
      res.status(400).json({ message: 'Search query (q) is required' });
      return;
    }

    // Validate type
    const validTypes = ['all', 'departments', 'people'];
    if (!validTypes.includes(type as string)) {
      res
        .status(400)
        .json({ message: 'Invalid type. Must be: all, departments, or people' });
      return;
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(1, parseInt(limit as string, 10) || 20), 100);
    const parsedOffset = Math.max(0, parseInt(offset as string, 10) || 0);

    const results = search(orgId!, req.user!.id, {
      query: (q as string).trim(),
      type: type as 'all' | 'departments' | 'people',
      limit: parsedLimit,
      offset: parsedOffset,
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
});

/**
 * GET /api/organizations/:orgId/search/autocomplete
 * Fast autocomplete suggestions for search
 *
 * Query Parameters:
 * - q: Partial search query (required, min 1 char)
 * - limit: Max suggestions (default: 5, max: 10)
 */
router.get('/organizations/:orgId/search/autocomplete', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId } = req.params;
    const { q, limit = '5' } = req.query;

    // Validate query
    if (!q || (q as string).trim().length === 0) {
      res.json({ suggestions: [] });
      return;
    }

    // Parse and validate limit
    const parsedLimit = Math.min(Math.max(1, parseInt(limit as string, 10) || 5), 10);

    const results = getAutocompleteSuggestions(orgId!, req.user!.id, (q as string).trim(), parsedLimit);

    res.json(results);
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 403 || error.status === 404) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    next(err);
  }
});

export default router;
