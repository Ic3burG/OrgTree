import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { search, getAutocompleteSuggestions } from '../services/search.service.js';

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
router.get('/organizations/:orgId/search', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { q, type = 'all', limit = '20', offset = '0' } = req.query;

    // Validate query
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query (q) is required' });
    }

    // Validate type
    const validTypes = ['all', 'departments', 'people'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be: all, departments, or people' });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const results = search(orgId, req.user.id, {
      query: q.trim(),
      type,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json(results);
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      return res.status(err.status).json({ message: err.message });
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
router.get('/organizations/:orgId/search/autocomplete', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { q, limit = '5' } = req.query;

    // Validate query
    if (!q || q.trim().length === 0) {
      return res.json({ suggestions: [] });
    }

    // Parse and validate limit
    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 5), 10);

    const results = getAutocompleteSuggestions(orgId, req.user.id, q.trim(), parsedLimit);

    res.json(results);
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
});

export default router;
