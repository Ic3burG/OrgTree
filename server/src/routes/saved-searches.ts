import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  createSavedSearch, 
  getSavedSearches, 
  deleteSavedSearch 
} from '../services/search.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

router.post(
  '/organizations/:orgId/saved-searches',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { name, query, filters, isShared } = req.body;

      if (!name || !query) {
        res.status(400).json({ message: 'Name and query are required' });
        return;
      }

      const savedSearch = await createSavedSearch(
        orgId,
        req.user!.id,
        name,
        query,
        filters,
        isShared
      );

      res.status(201).json(savedSearch);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/organizations/:orgId/saved-searches',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const searches = await getSavedSearches(orgId, req.user!.id);
      res.json(searches);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/organizations/:orgId/saved-searches/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await deleteSavedSearch(id, req.user!.id);
      
      if (!success) {
        // Could be 404 or 403 (not owner), but service returns boolean
        res.status(404).json({ message: 'Saved search not found or access denied' });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
