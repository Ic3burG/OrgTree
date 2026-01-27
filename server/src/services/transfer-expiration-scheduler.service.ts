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
