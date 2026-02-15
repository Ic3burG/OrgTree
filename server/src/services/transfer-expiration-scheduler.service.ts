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

import cron from 'node-cron';
import { expireOldTransfers } from './ownership-transfer.service.js';
import logger from '../utils/logger.js';

/**
 * Schedule automatic expiration of old pending ownership transfers
 * Runs daily at 2:00 AM
 */
export function scheduleTransferExpiration(): void {
  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('[TransferExpiration] Starting scheduled expiration check');

    try {
      const expiredCount = expireOldTransfers();

      if (expiredCount > 0) {
        logger.info('[TransferExpiration] Expired transfers', { count: expiredCount });
      } else {
        logger.info('[TransferExpiration] No transfers to expire');
      }
    } catch (error) {
      logger.error('[TransferExpiration] Error during scheduled expiration', { error });
    }
  });

  logger.info('[TransferExpiration] Scheduled daily expiration job at 2:00 AM');
}
