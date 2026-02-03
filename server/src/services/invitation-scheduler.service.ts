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
