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
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

/**
 * Debug endpoint to check user authentication and org membership
 * GET /api/debug/auth/:orgId
 */
router.get('/auth/:orgId', (req: Request, res: Response): void => {
  const authReq = req as AuthRequest;
  const { orgId } = req.params;

  res.json({
    timestamp: new Date().toISOString(),
    authenticated: !!authReq.user,
    user: authReq.user
      ? {
          id: authReq.user.id,
          email: authReq.user.email,
          systemRole: authReq.user.role,
        }
      : null,
    orgId,
    headers: {
      authorization: req.headers.authorization?.substring(0, 20) + '...',
      'user-agent': req.headers['user-agent'],
    },
  });
});

export default router;
