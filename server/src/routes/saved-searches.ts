/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
} from '../services/search.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

router.post(
  '/organizations/:orgId/saved-searches',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.params.orgId;
      if (!orgId) {
        res.status(400).json({ message: 'Organization ID is required' });
        return;
      }
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
      const orgId = req.params.orgId;
      if (!orgId) {
        res.status(400).json({ message: 'Organization ID is required' });
        return;
      }
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
      const orgId = req.params.orgId;
      if (!orgId) {
        res.status(400).json({ message: 'Organization ID is required' });
        return;
      }
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
