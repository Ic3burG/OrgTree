import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Only initialize if DSN is configured
  if (!dsn) {
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

    beforeSend(event) {
      // Don't send errors in development unless explicitly enabled
      if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_DEBUG !== 'true') {
        return null;
      }
      return event;
    },
  });
}

// Re-export Sentry for use elsewhere
export { Sentry };
