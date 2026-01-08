import * as Sentry from '@sentry/node';

/**
 * Capture unhandled rejections and exceptions
 * This should be called early in development if not using --import
 * or as a safety layer even with --import
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    Sentry.captureException(reason);
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    Sentry.captureException(error);
    // Give Sentry time to send the error before crashing
    setTimeout(() => process.exit(1), 2000);
  });
}

// Re-export Sentry for manual captures
export { Sentry };
