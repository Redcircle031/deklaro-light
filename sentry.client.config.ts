/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser/client-side.
 * It will capture errors, performance data, and user sessions.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_ENABLED = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment (development, staging, production)
    environment: ENVIRONMENT,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Capture 10% of all user sessions for Session Replay
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,

    // Capture 100% of sessions with errors for Session Replay
    replaysOnErrorSampleRate: 1.0,

    // You can remove this option if you're not planning to use the Sentry Session Replay feature
    integrations: [
      Sentry.replayIntegration({
        // Additional SDK configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      // Common third-party errors
      'ResizeObserver loop limit exceeded',
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Remove sensitive cookies
      if (event.request?.cookies) {
        delete event.request.cookies['sb-access-token'];
        delete event.request.cookies['sb-refresh-token'];
      }

      return event;
    },

    // Set user context (will be set by auth system)
    // User info will be added in the app when user logs in
  });

  console.log('[Sentry] Client initialized in', ENVIRONMENT, 'mode');
} else {
  if (ENVIRONMENT === 'production') {
    console.warn('[Sentry] Not initialized - DSN missing or disabled');
  }
}
