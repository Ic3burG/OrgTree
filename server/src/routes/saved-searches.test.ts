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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../services/search.service.js', () => ({
  createSavedSearch: vi.fn(),
  getSavedSearches: vi.fn(),
  deleteSavedSearch: vi.fn(),
}));

import savedSearchesRouter from './saved-searches.js';
import * as searchService from '../services/search.service.js';

describe('Saved Searches Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;
  const JWT_SECRET = 'test-secret-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;

    app = express();
    app.use(express.json());
    app.use('/api', savedSearchesRouter);

    // Error handler
    app.use(
      (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err.status || 500).json({ message: err.message });
      }
    );
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = 'user-1', role = 'viewer') => {
    return jwt.sign(
      { id: userId, email: 'test@example.com', name: 'Test User', role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  describe('POST /api/organizations/:orgId/saved-searches', () => {
    it('should create a saved search', async () => {
      const mockSearch = { id: 's1', name: 'My Search', query: 'test' };
      vi.mocked(searchService.createSavedSearch).mockResolvedValue(mockSearch as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org-1/saved-searches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Search', query: 'test', filters: {}, isShared: false })
        .expect(201);

      expect(response.body).toEqual(mockSearch);
      expect(searchService.createSavedSearch).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        'My Search',
        'test',
        {},
        false
      );
    });

    it('should return 400 if name or query is missing', async () => {
      const token = createAuthToken();
      await request(app)
        .post('/api/organizations/org-1/saved-searches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Search' })
        .expect(400);

      expect(searchService.createSavedSearch).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/organizations/:orgId/saved-searches', () => {
    it('should list saved searches', async () => {
      const mockSearches = [{ id: 's1', name: 'Search 1' }];
      vi.mocked(searchService.getSavedSearches).mockResolvedValue(mockSearches as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/organizations/org-1/saved-searches')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockSearches);
      expect(searchService.getSavedSearches).toHaveBeenCalledWith('org-1', 'user-1');
    });
  });

  describe('DELETE /api/organizations/:orgId/saved-searches/:id', () => {
    it('should delete a saved search', async () => {
      vi.mocked(searchService.deleteSavedSearch).mockResolvedValue(true);

      const token = createAuthToken();
      await request(app)
        .delete('/api/organizations/org-1/saved-searches/s1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(searchService.deleteSavedSearch).toHaveBeenCalledWith('s1', 'user-1');
    });

    it('should return 404 if search not found or not owned', async () => {
      vi.mocked(searchService.deleteSavedSearch).mockResolvedValue(false);

      const token = createAuthToken();
      await request(app)
        .delete('/api/organizations/org-1/saved-searches/s1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
