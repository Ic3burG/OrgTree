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
