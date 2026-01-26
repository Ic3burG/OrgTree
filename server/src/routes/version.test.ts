import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import versionRouter from './version.js';

describe('Version Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/api', versionRouter);
  });

  describe('GET /api/version', () => {
    it('should return version information', async () => {
      const response = await request(app).get('/api/version');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('deployDate');
      expect(response.body).toHaveProperty('nodeVersion');
      expect(response.body).toHaveProperty('features');
      expect(response.body.features.viewerCanSearch).toBe(true);
    });
  });
});
