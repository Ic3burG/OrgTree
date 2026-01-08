import * as Sentry from '@sentry/node';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  // Use dynamic import for dotenv to avoid issues in production where it might not be installed
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch {
    // Ignore error if dotenv is missing
  }
}

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Enable profiling
    // profilesSampleRate is relative to tracesSampleRate
    profilesSampleRate: 1.0,

    // Only send errors in production by default unless debug is on
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
        const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'token'];
        const data = event.request.data as Record<string, unknown>;
        sensitiveFields.forEach(field => {
          if (field in data) {
            data[field] = '[REDACTED]';
          }
        });
      }

      return event;
    },
  });

  console.log('Sentry initialized via instrumentation:', process.env.NODE_ENV || 'development');
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Sentry: No DSN configured, skipping instrumentation');
  }
}
