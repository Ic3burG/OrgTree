import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import debugRouter from './debug.js';

describe('Debug Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/api/debug', debugRouter);
  });

  it('should return debug auth info', async () => {
    const orgId = 'org-123';
    const response = await request(app).get(`/api/debug/auth/${orgId}`);

    expect(response.status).toBe(200);
    expect(response.body.orgId).toBe(orgId);
    expect(response.body).toHaveProperty('timestamp');
  });
});
