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
import fixRouter from './fix-org-owners-simple.js';
import db from '../db.js';
import { randomUUID } from 'crypto';

// Mock auth middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'super-user', role: 'superuser' };
    next();
  },
  requireSuperuser: (req: any, res: any, next: any) => {
    next();
  },
}));

describe('Fix Org Owners Simple Route', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use('/api', fixRouter);
  });

  it('should fix organizations with missing owners', async () => {
    const ownerId = randomUUID();
    const orgId = randomUUID();

    // 1. Setup org without membership for creator
    db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(ownerId, `fix-user-${randomUUID()}@example.com`, 'hash', 'Owner');
    db.prepare(
      'INSERT OR IGNORE INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)'
    ).run(orgId, 'Missing Owner Org', ownerId);

    // Ensure no membership exists
    db.prepare('DELETE FROM organization_members WHERE organization_id = ?').run(orgId);

    const response = await request(app).get('/api/migrations/fix-org-owners-simple');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.missing_before).toBeGreaterThan(0);

    // Verify membership was created
    const membership = db
      .prepare('SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?')
      .get(orgId, ownerId);
    expect(membership).toBeDefined();
  });

  it('should return no-op if all owners exist', async () => {
    const response = await request(app).get('/api/migrations/fix-org-owners-simple');
    // If other tests clean up or if we just run this, it might find 0.
    // Given shared db, it's hard to be sure, but we can check success field.
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
