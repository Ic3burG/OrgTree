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

// ============================================================================
// Metrics Middleware
// Express middleware to track request timing
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { recordRequestTiming } from '../services/metrics-collector.service.js';

/**
 * Middleware to record API request timing
 * Should be applied early in the middleware chain
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Skip health checks and static assets to reduce noise
  if (req.path === '/api/health' || !req.path.startsWith('/api')) {
    return next();
  }

  // Record timing on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    recordRequestTiming({
      timestamp: startTime,
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
    });
  });

  next();
}
