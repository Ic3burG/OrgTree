import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Only initialize if DSN is configured
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('Sentry: No DSN configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay for debugging (optional, can be enabled later)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,

    // Only send errors in production by default
    enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_DEBUG === 'true',

    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      /extensions\//i,
      /^chrome-extension:\/\//,
      // Network errors (often user connectivity issues)
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // User-cancelled requests
      'AbortError',
    ],

    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_DEBUG !== 'true') {
        console.log('Sentry would send:', event);
        return null;
      }
      return event;
    },
  });

  if (import.meta.env.DEV) {
    console.log('Sentry initialized for environment:', import.meta.env.MODE);
  }
}

// Re-export Sentry for use elsewhere
export { Sentry };
