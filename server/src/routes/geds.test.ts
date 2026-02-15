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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import gedsRouter from './geds.js';
import { randomUUID as _randomUUID } from 'crypto';
import _jwt from 'jsonwebtoken';

// Mock authentication middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  },
}));

describe('GEDS Routes', () => {
  let app: express.Express;
  const _JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/geds', gedsRouter);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GET /api/geds/proxy', () => {
    it('should proxy a valid GEDS URL', async () => {
      const mockGedsUrl = 'https://geds-sage.gc.ca/en/GEDS?abc=123';
      const mockResponseBody = '<html>GEDS Data</html>';

      (fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(mockResponseBody),
      });

      const response = await request(app).get('/api/geds/proxy').query({ url: mockGedsUrl });

      expect(response.status).toBe(200);
      expect(response.text).toBe(mockResponseBody);
      expect(response.header['content-type']).toContain('text/html');
      expect(fetch).toHaveBeenCalledWith(mockGedsUrl, expect.any(Object));
    });

    it('should return 400 for missing URL', async () => {
      const response = await request(app).get('/api/geds/proxy');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing URL parameter');
    });

    it('should return 400 for invalid domain', async () => {
      const response = await request(app)
        .get('/api/geds/proxy')
        .query({ url: 'https://malicious-site.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Only GEDS-SAGE domain is allowed');
    });

    it('should return GEDS error status if request fails', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map(),
      });

      const response = await request(app)
        .get('/api/geds/proxy')
        .query({ url: 'https://geds-sage.gc.ca/unknown' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('GEDS returned error 404');
    });

    it('should handle fetch exceptions', async () => {
      (fetch as any).mockRejectedValue(new Error('Network failure'));

      const response = await request(app)
        .get('/api/geds/proxy')
        .query({ url: 'https://geds-sage.gc.ca/timeout' });

      expect(response.status).toBe(500);
    });
  });
});
