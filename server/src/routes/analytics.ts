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

import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { trackEvent, trackEvents } from '../services/analytics.service.js';
import logger from '../utils/logger.js';
import { AnalyticsEvent } from '../types/analytics.js';
import { JWTPayload } from '../types/index.js';

const router = express.Router();

// Rate limiter for analytics endpoint
// Allow 100 requests per 15 minutes per IP
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analytics requests, please try again later.' },
});

// Helper to extract user from token without throwing
const getOptionalUser = (req: Request): JWTPayload | null => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return jwt.verify(token, secret) as unknown as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * POST /api/analytics/events
 * Track one or more analytics events
 * Public endpoint (rate limited) but handles authenticated user context if available
 */
router.post('/events', analyticsLimiter, (req: Request, res: Response): void => {
  try {
    const { events, event } = req.body;

    // Handle authenticated user if present
    const user = getOptionalUser(req);
    const userId = user?.id;

    const commonProps = {
      user_id: userId, // Will be undefined if not logged in
      device_type: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop', // Simple detection
    };

    if (Array.isArray(events)) {
      // Batch tracking
      const enrichedEvents = events.map((e: AnalyticsEvent) => ({
        ...e,
        ...commonProps,
        user_id: e.user_id || commonProps.user_id, // Prefer event's user_id if provided (rare), else auth user
      }));
      trackEvents(enrichedEvents);
      res.status(202).json({ received: true, count: events.length });
    } else if (event || req.body.event_name) {
      // Single event tracking
      const e = event || req.body;
      const enrichedEvent = {
        ...e,
        ...commonProps,
        user_id: e.user_id || commonProps.user_id,
      };
      trackEvent(enrichedEvent);
      res.status(202).json({ received: true });
    } else {
      res
        .status(400)
        .json({ error: 'Invalid payload. Expected "events" array or single event object.' });
    }
  } catch (error) {
    logger.error('Error in analytics endpoint', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
