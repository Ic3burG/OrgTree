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
import { logger } from '../utils/logger.js';
import { sendInvitationReminders } from './invitation.service.js';

/**
 * Schedule daily invitation reminders
 * Runs every day at 09:00 UTC
 */
export function scheduleInvitationReminders(): void {
  // Run everyday at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('[InvitationReminders] Starting scheduled reminder check');
    try {
      const count = await sendInvitationReminders();
      if (count > 0) {
        logger.info(`[InvitationReminders] Sent ${count} invitation reminders`);
      } else {
        logger.info('[InvitationReminders] No reminders to send');
      }
    } catch (error) {
      logger.error('[InvitationReminders] Failed to send reminders', { error });
    }
  });

  logger.info('[InvitationReminders] Scheduled daily reminder job at 09:00 AM');
}
