import * as Sentry from '@sentry/node';

export function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;

  // Only initialize if DSN is configured
  if (!dsn) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sentry: No DSN configured, skipping initialization');
    }
    return { requestHandler: null, errorHandler: null };
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
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'token'];
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]';
          }
        });
      }

      return event;
    },
  });

  console.log('Sentry initialized for environment:', process.env.NODE_ENV || 'development');

  return {
    // Request handler creates a trace for each request
    requestHandler: Sentry.Handlers.requestHandler(),
    // Error handler captures errors
    errorHandler: Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture 4xx and 5xx errors
        return error.status >= 400 || !error.status;
      },
    }),
  };
}

// Capture unhandled rejections
export function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    Sentry.captureException(reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    Sentry.captureException(error);
    // Give Sentry time to send the error before crashing
    setTimeout(() => process.exit(1), 2000);
  });
}

// Re-export Sentry for manual captures
export { Sentry };
