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

import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all proxy routes
router.use(authenticateToken);

/**
 * GET /api/geds/proxy?url=...
 * Proxies a request to GEDS to bypass CORS and network restrictions
 */
router.get('/proxy', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'Missing URL parameter' });
      return;
    }

    // Safety check: Only allow GEDS domain
    if (!url.startsWith('https://geds-sage.gc.ca')) {
      res.status(400).json({ message: 'Only GEDS-SAGE domain is allowed' });
      return;
    }

    logger.info('Proxying GEDS request', { url, userId: req.user?.id });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OrgTree/1.0 (Organizational Directory App)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      logger.error('GEDS proxy request failed', {
        url,
        status: response.status,
        userId: req.user?.id,
      });
      res.status(response.status).json({ message: `GEDS returned error ${response.status}` });
      return;
    }

    // Pass through relevant headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Get the response body as text and send it
    const body = await response.text();
    res.send(body);
  } catch (err) {
    logger.error('GEDS proxy unexpected error', { err, query: req.query });
    next(err);
  }
});

export default router;
