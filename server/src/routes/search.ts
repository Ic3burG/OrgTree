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
    }
    next();
  } catch {
    // Ignore invalid tokens for optional auth, just proceed as guest
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
