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

const router = express.Router();

// Update this with each deploy to track which version is running
const DEPLOY_VERSION = 'ff63b27-search-fixes';
const DEPLOY_DATE = '2026-01-25';

/**
 * GET /api/version
 * Returns deployment version information
 */
router.get('/version', (_req: Request, res: Response): void => {
  res.json({
    version: DEPLOY_VERSION,
    deployDate: DEPLOY_DATE,
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: {
      searchPermissionFix: true,
      ftsRebuildComplete: true,
      viewerCanSearch: true,
    },
  });
});

export default router;
