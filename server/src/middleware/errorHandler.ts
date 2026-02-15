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

import type { Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';

interface ErrorWithStatus extends Error {
  status?: number;
}

export function errorHandler(
  err: ErrorWithStatus,
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  logger.error(err.message, {
    error: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  if (err.name === 'ValidationError') {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
}
