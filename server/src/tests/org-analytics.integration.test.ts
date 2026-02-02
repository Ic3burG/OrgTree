import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../services/auth.service.js';

describe('Org Analytics API Integration', () => {
  let userId: string;
  let orgId: string;
  let token: string;

  beforeEach(() => {
    // Setup data
    userId = uuidv4();
    orgId = uuidv4();

    // Create user
    db.prepare(
      `
            INSERT INTO users (id, name, email, password_hash, created_at)
            VALUES (@id, 'Integration Test User', @email, 'hash', datetime('now'))
        `
    ).run({ id: userId, email: `int-test-${uuidv4()}@example.com` });

    // Create org
    db.prepare(
      `
            INSERT INTO organizations (id, name, created_by_id, created_at, updated_at)
            VALUES (@id, 'Integration Org', @userId, datetime('now'), datetime('now'))
        `
    ).run({ id: orgId, userId });

    // Add as owner
    db.prepare(
      `
            INSERT INTO organization_members (organization_id, user_id, role, added_by_id, created_at)
            VALUES (@orgId, @userId, 'owner', @userId, datetime('now'))
        `
    ).run({ orgId, userId });

    token = generateToken({ id: userId, email: 'test@example.com' } as any);
  });

  it('GET /api/organizations/:id/analytics/overview should return 200 and data', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/analytics/overview`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalDepartments');
    expect(res.body).toHaveProperty('totalPeople');
  });

  it('GET /api/organizations/:id/analytics/growth should return 200 and trends', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/analytics/growth?period=30d`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/organizations/:id/analytics/health should return 200 and stats', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/analytics/health`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('maxDepth');
    expect(res.body).toHaveProperty('avgSpanOfControl');
    expect(res.body.avgSpanOfControl).toBe(0); // Feature disabled
  });
});
