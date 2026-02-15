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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { search, getAutocompleteSuggestions } from '../services/search.service.js';
import searchRoutes from './search.js';
import jwt from 'jsonwebtoken';

// Mock Search services
vi.mock('../services/search.service.js', () => ({
  search: vi.fn(),
  getAutocompleteSuggestions: vi.fn(),
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
// No manual user injection middleware here so we can test the real optionalAuthenticate
app.use('/api', searchRoutes);

describe('Search Routes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };
  });

  describe('GET /api/organizations/:orgId/search', () => {
    it('should return search results', async () => {
      const mockResults = {
        results: [{ id: 'p1', name: 'Person 1', type: 'person' }],
        total: 1,
        limit: 20,
        offset: 0,
      };
      vi.mocked(search).mockResolvedValue(mockResults as any);

      // Successfully authenticated request
      vi.mocked(jwt.verify).mockReturnValue({ id: 'user-123' } as any);

      const res = await request(app)
        .get('/api/organizations/org-1/search?q=test')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toEqual(mockResults);
      expect(search).toHaveBeenCalledWith(
        'org-1',
        'user-123',
        expect.objectContaining({ query: 'test' })
      );
    });

    it('should work without authentication (guest)', async () => {
      vi.mocked(search).mockResolvedValue({ results: [] } as any);

      await request(app).get('/api/organizations/org-1/search?q=test').expect(200);

      expect(search).toHaveBeenCalledWith(
        'org-1',
        undefined, // No user ID
        expect.objectContaining({ query: 'test' })
      );
    });

    it('should ignore invalid token and proceed as guest', async () => {
      vi.mocked(search).mockResolvedValue({ results: [] } as any);
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await request(app)
        .get('/api/organizations/org-1/search?q=test')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(search).toHaveBeenCalledWith(
        'org-1',
        undefined, // Should be undefined because auth failed gracefully
        expect.objectContaining({ query: 'test' })
      );
    });

    it('should validate required params', async () => {
      await request(app)
        .get('/api/organizations/org-1/search') // Missing q
        .expect(400);
    });

    it('should validate type param', async () => {
      await request(app).get('/api/organizations/org-1/search?q=test&type=invalid').expect(400);
    });

    it('should handle pagination params', async () => {
      vi.mocked(search).mockResolvedValue({ results: [] } as any);

      await request(app)
        .get('/api/organizations/org-1/search?q=test&limit=50&offset=10')
        .expect(200);

      expect(search).toHaveBeenCalledWith(
        'org-1',
        undefined,
        expect.objectContaining({
          limit: 50,
          offset: 10,
        })
      );
    });

    it('should handle starred filter', async () => {
      vi.mocked(search).mockResolvedValue({ results: [] } as any);

      await request(app).get('/api/organizations/org-1/search?q=test&starred=true').expect(200);

      expect(search).toHaveBeenCalledWith(
        'org-1',
        undefined,
        expect.objectContaining({
          starredOnly: true,
        })
      );
    });

    it('should handle service errors', async () => {
      vi.mocked(search).mockImplementation(() => {
        const err: any = new Error('Forbidden');
        err.status = 403;
        throw err;
      });

      await request(app).get('/api/organizations/org-1/search?q=secret').expect(403);
    });
  });

  describe('GET /api/organizations/:orgId/search/autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const mockSuggestions = { suggestions: [{ text: 'Suggestion 1', type: 'person', id: 'p1' }] };
      vi.mocked(getAutocompleteSuggestions).mockResolvedValue(mockSuggestions as any);
      vi.mocked(jwt.verify).mockReturnValue({ id: 'user-123' } as any);

      const res = await request(app)
        .get('/api/organizations/org-1/search/autocomplete?q=sugg')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toEqual(mockSuggestions);
      expect(getAutocompleteSuggestions).toHaveBeenCalledWith('org-1', 'user-123', 'sugg', 5);
    });

    it('should return empty list if q is empty', async () => {
      const res = await request(app)
        .get('/api/organizations/org-1/search/autocomplete?q=')
        .expect(200);

      expect(res.body.suggestions).toEqual([]);
      expect(getAutocompleteSuggestions).not.toHaveBeenCalled();
    });

    it('should respect limit param', async () => {
      vi.mocked(getAutocompleteSuggestions).mockResolvedValue({ suggestions: [] } as any);

      await request(app)
        .get('/api/organizations/org-1/search/autocomplete?q=abc&limit=8')
        .expect(200);

      expect(getAutocompleteSuggestions).toHaveBeenCalledWith('org-1', undefined, 'abc', 8);
    });

    it('should handle autocomplete error (403)', async () => {
      vi.mocked(getAutocompleteSuggestions).mockImplementation(() => {
        const err: any = new Error('Forbidden');
        err.status = 403;
        throw err;
      });

      await request(app).get('/api/organizations/org-1/search/autocomplete?q=secret').expect(403);
    });
  });
});
