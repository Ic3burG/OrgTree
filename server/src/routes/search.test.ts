import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { search, getAutocompleteSuggestions } from '../services/search.service.js';
import searchRoutes from './search.js';

// Mock Search services
vi.mock('../services/search.service.js', () => ({
  search: vi.fn(),
  getAutocompleteSuggestions: vi.fn(),
}));

// Mock Auth Middleware / JWT logic for tests
// We need to bypass JWT verification in the test app
const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  // Simulate a logged-in user
  req.user = { id: 'user-123', email: 'test@example.com' };
  next();
});
app.use('/api', searchRoutes);

describe('Search Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      const res = await request(app).get('/api/organizations/org-1/search?q=test').expect(200);

      expect(res.body).toEqual(mockResults);
      expect(search).toHaveBeenCalledWith(
        'org-1',
        'user-123',
        expect.objectContaining({
          query: 'test',
          type: 'all',
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should validate required params', async () => {
      await request(app)
        .get('/api/organizations/org-1/search') // Missing q
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('required');
        });
    });

    it('should validate type param', async () => {
      await request(app)
        .get('/api/organizations/org-1/search?q=test&type=invalid')
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Invalid type');
        });
    });

    it('should handle pagination params', async () => {
      vi.mocked(search).mockResolvedValue({ results: [] } as any);

      await request(app)
        .get('/api/organizations/org-1/search?q=test&limit=50&offset=10')
        .expect(200);

      expect(search).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
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
        expect.anything(),
        expect.anything(),
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

      const res = await request(app)
        .get('/api/organizations/org-1/search/autocomplete?q=sugg')
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

      expect(getAutocompleteSuggestions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        8
      );
    });
  });
});
