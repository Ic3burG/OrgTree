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
