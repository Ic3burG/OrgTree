import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import ftsMaintenanceRouter from './fts-maintenance.js';
import { authenticateToken } from '../middleware/auth.js';
import * as ftsService from '../services/fts-maintenance.service.js';

// Mock dependencies
vi.mock('../middleware/auth.js');
vi.mock('../services/fts-maintenance.service.js');

const app = express();
app.use(express.json());
app.use('/api/fts-maintenance', ftsMaintenanceRouter);

describe('FTS Maintenance Routes', () => {
  const mockSuperuser = {
    id: 'user-1',
    email: 'superuser@example.com',
    role: 'superuser',
  };

  const mockAdmin = {
    id: 'user-2',
    email: 'admin@example.com',
    role: 'admin',
  };

  let currentUser: any = mockSuperuser;

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = mockSuperuser;

    // Setup default auth mock
    vi.mocked(authenticateToken).mockImplementation((req, _res, next) => {
      // @ts-expect-error: mocking express request user
      req.user = currentUser;
      next();
    });
  });

  describe('GET /api/fts-maintenance/health', () => {
    it('should return FTS health status', async () => {
      const mockHealth = {
        healthy: true,
        tables: [],
        lastChecked: new Date().toISOString(),
        issues: [],
      };
      vi.mocked(ftsService.checkFtsIntegrity).mockReturnValue(mockHealth as any);

      const response = await request(app).get('/api/fts-maintenance/health').expect(200);

      expect(response.body).toEqual(mockHealth);
      expect(ftsService.checkFtsIntegrity).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(ftsService.checkFtsIntegrity).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/fts-maintenance/health').expect(500);

      expect(response.body.error).toBe('Failed to check FTS health');
      expect(response.body.details).toBe('Database error');
    });
  });

  describe('FTS Rebuild Operations', () => {
    it('should allow superuser to rebuild all indexes', async () => {
      const mockHealth = { healthy: true, tables: [] };
      vi.mocked(ftsService.rebuildAllFtsIndexes).mockReturnValue(mockHealth as any);

      const response = await request(app).post('/api/fts-maintenance/rebuild/all').expect(200);

      expect(response.body.message).toBe('FTS indexes rebuilt successfully');
      expect(response.body.health).toEqual(mockHealth);
      expect(ftsService.rebuildAllFtsIndexes).toHaveBeenCalled();
    });

    it('should forbid non-superuser from rebuilding all indexes', async () => {
      currentUser = mockAdmin;

      const response = await request(app).post('/api/fts-maintenance/rebuild/all').expect(403);

      expect(response.body.error).toContain('Superuser access required');
      expect(ftsService.rebuildAllFtsIndexes).not.toHaveBeenCalled();
    });

    it('should allow superuser to rebuild departments index', async () => {
      const mockHealth = { healthy: true, tables: [] };
      vi.mocked(ftsService.checkFtsIntegrity).mockReturnValue(mockHealth as any);

      const response = await request(app)
        .post('/api/fts-maintenance/rebuild/departments')
        .expect(200);

      expect(response.body.message).toBe('departments_fts rebuilt successfully');
      expect(ftsService.rebuildDepartmentsFts).toHaveBeenCalled();
      expect(ftsService.checkFtsIntegrity).toHaveBeenCalled();
    });

    it('should allow superuser to rebuild people index', async () => {
      const mockHealth = { healthy: true, tables: [] };
      vi.mocked(ftsService.checkFtsIntegrity).mockReturnValue(mockHealth as any);

      const response = await request(app).post('/api/fts-maintenance/rebuild/people').expect(200);

      expect(response.body.message).toBe('people_fts rebuilt successfully');
      expect(ftsService.rebuildPeopleFts).toHaveBeenCalled();
    });

    it('should allow superuser to rebuild custom fields index', async () => {
      const mockHealth = { healthy: true, tables: [] };
      vi.mocked(ftsService.checkFtsIntegrity).mockReturnValue(mockHealth as any);

      const response = await request(app)
        .post('/api/fts-maintenance/rebuild/custom-fields')
        .expect(200);

      expect(response.body.message).toBe('custom_fields_fts rebuilt successfully');
      expect(ftsService.rebuildCustomFieldsFts).toHaveBeenCalled();
    });

    it('should handle rebuild errors', async () => {
      vi.mocked(ftsService.rebuildAllFtsIndexes).mockImplementation(() => {
        throw new Error('Rebuild failed');
      });

      const response = await request(app).post('/api/fts-maintenance/rebuild/all').expect(500);

      expect(response.body.error).toBe('Failed to rebuild FTS indexes');
      expect(response.body.details).toBe('Rebuild failed');
    });
  });

  describe('POST /api/fts-maintenance/optimize', () => {
    it('should allow superuser to optimize index', async () => {
      const response = await request(app).post('/api/fts-maintenance/optimize').expect(200);

      expect(response.body.message).toBe('FTS indexes optimized successfully');
      expect(ftsService.optimizeFtsIndexes).toHaveBeenCalled();
    });

    it('should forbid non-superuser from optimizing', async () => {
      currentUser = mockAdmin;

      const response = await request(app).post('/api/fts-maintenance/optimize').expect(403);

      expect(response.body.error).toContain('Superuser access required');
      expect(ftsService.optimizeFtsIndexes).not.toHaveBeenCalled();
    });

    it('should handle optimization errors', async () => {
      vi.mocked(ftsService.optimizeFtsIndexes).mockImplementation(() => {
        throw new Error('Optimization failed');
      });

      const response = await request(app).post('/api/fts-maintenance/optimize').expect(500);

      expect(response.body.error).toBe('Failed to optimize FTS indexes');
    });
  });
});
