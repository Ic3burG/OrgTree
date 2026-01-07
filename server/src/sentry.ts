import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn: string | undefined = process.env.SENTRY_DSN;

  // Only initialize if DSN is configured
  if (!dsn) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sentry: No DSN configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Only send errors in production by default
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

    // Additional context
    serverName: process.env.RENDER_SERVICE_NAME || 'orgtree-server',

    // Filter sensitive data
    beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint): Sentry.ErrorEvent | null {
      // Remove sensitive headers
      if (event.request?.headers && typeof event.request.headers === 'object') {
        const headers = event.request.headers as Record<string, string>;
        delete headers.authorization;
        delete headers.cookie;
      }

      // Remove sensitive data from request body
      if (event.request?.data && typeof event.request.data === 'object') {
        const sensitiveFields: string[] = ['password', 'oldPassword', 'newPassword', 'token'];
        const data = event.request.data as Record<string, unknown>;
        sensitiveFields.forEach((field: string) => {
          if (field in data) {
            data[field] = '[REDACTED]';
          }
        });
      }

      return event;
    },
  });

  console.log('Sentry initialized for environment:', process.env.NODE_ENV || 'development');
}

// Capture unhandled rejections
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
