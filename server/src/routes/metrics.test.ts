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
import metricsRouter from './metrics.js';
import * as metricsService from '../services/metrics.service.js';

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

// Mock metrics service
vi.mock('../services/metrics.service.js', () => ({
  getOverviewMetrics: vi.fn(),
  getUsageMetrics: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  getAuditMetrics: vi.fn(),
}));

describe('Metrics Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', metricsRouter);
  });

  it('GET /api/admin/metrics/overview should return overview metrics', async () => {
    const mockData = { totalUsers: 10, totalOrgs: 5 };
    (metricsService.getOverviewMetrics as any).mockReturnValue(mockData);

    const response = await request(app).get('/api/admin/metrics/overview');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockData);
    expect(metricsService.getOverviewMetrics).toHaveBeenCalled();
  });

  it('GET /api/admin/metrics/usage should return usage metrics', async () => {
    const mockData = { activeUsers: 5 };
    (metricsService.getUsageMetrics as any).mockReturnValue(mockData);

    const response = await request(app).get('/api/admin/metrics/usage');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockData);
    expect(metricsService.getUsageMetrics).toHaveBeenCalled();
  });

  it('GET /api/admin/metrics/performance should return performance metrics', async () => {
    const mockData = { uptime: 3600 };
    (metricsService.getPerformanceMetrics as any).mockReturnValue(mockData);

    const response = await request(app).get('/api/admin/metrics/performance');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockData);
    expect(metricsService.getPerformanceMetrics).toHaveBeenCalled();
  });

  it('GET /api/admin/metrics/audit should return audit metrics', async () => {
    const mockData = { totalLogs: 100 };
    (metricsService.getAuditMetrics as any).mockReturnValue(mockData);

    const response = await request(app).get('/api/admin/metrics/audit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockData);
    expect(metricsService.getAuditMetrics).toHaveBeenCalled();
  });
});
