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
import analyticsRouter from './analytics.js';
import * as analyticsService from '../services/analytics.service.js';
import jwt from 'jsonwebtoken';

vi.mock('../services/analytics.service.js', () => ({
  trackEvent: vi.fn(),
  trackEvents: vi.fn(),
}));

describe('Analytics Routes', () => {
  let app: express.Express;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRouter);
  });

  describe('POST /api/analytics/events', () => {
    it('should track a single event', async () => {
      const mockEvent = { event_name: 'test_event', properties: { foo: 'bar' } };

      const response = await request(app).post('/api/analytics/events').send(mockEvent);

      expect(response.status).toBe(202);
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'test_event',
          properties: expect.objectContaining({ foo: 'bar' }),
          device_type: 'desktop',
        })
      );
    });

    it('should track batch events', async () => {
      const mockEvents = [{ event_name: 'event_1' }, { event_name: 'event_2' }];

      const response = await request(app)
        .post('/api/analytics/events')
        .send({ events: mockEvents });

      expect(response.status).toBe(202);
      expect(response.body.count).toBe(2);
      expect(analyticsService.trackEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ event_name: 'event_1' }),
          expect.objectContaining({ event_name: 'event_2' }),
        ])
      );
    });

    it('should include user context if authenticated', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ id: userId }, JWT_SECRET);
      const mockEvent = { event_name: 'auth_event' };

      const response = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${token}`)
        .send(mockEvent);

      expect(response.status).toBe(202);
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'auth_event',
          user_id: userId,
        })
      );
    });

    it('should return 400 for invalid payload', async () => {
      const response = await request(app).post('/api/analytics/events').send({ invalid: 'data' });

      expect(response.status).toBe(400);
    });
  });
});
