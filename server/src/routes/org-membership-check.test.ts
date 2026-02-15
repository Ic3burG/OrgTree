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
import orgMembershipRouter from './org-membership-check.js';
import * as memberService from '../services/member.service.js';
import db from '../db.js';
import { randomUUID } from 'crypto';

// Mock auth middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com' };
    next();
  },
}));

vi.mock('../services/member.service.js', () => ({
  checkOrgAccess: vi.fn(),
}));

describe('Org Membership Check Route', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use('/api', orgMembershipRouter);
  });

  it('should return membership info for an organization', async () => {
    const orgId = randomUUID();
    const userId = 'test-user';
    const ownerId = 'owner-user';

    (memberService.checkOrgAccess as any).mockReturnValue({
      hasAccess: true,
      role: 'admin',
      isOwner: false,
    });

    // Mock DB responses if needed, but using real in-memory DB is easier here
    db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(userId, 'test@example.com', 'hash', 'Test User');
    db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(ownerId, 'owner@example.com', 'hash', 'Owner User');
    db.prepare(
      'INSERT OR IGNORE INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)'
    ).run(orgId, 'Test Org', ownerId);
    db.prepare(
      'INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, added_by_id) VALUES (?, ?, ?, ?, ?)'
    ).run(randomUUID(), orgId, userId, 'admin', ownerId);

    const response = await request(app).get(`/api/debug/org-membership/${orgId}`);

    expect(response.status).toBe(200);
    expect(response.body.organization.name).toBe('Test Org');
    expect(response.body.accessCheck.hasAccess).toBe(true);
    expect(response.body.directMembership.role).toBe('admin');
  });
});
