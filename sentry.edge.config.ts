/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for Edge Runtime (middleware, edge functions).
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_ENABLED = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: ENVIRONMENT,

    // Lower sample rate for edge runtime (runs on every request)
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.05 : 0.5,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive request data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },

    // Add tags
    initialScope: {
      tags: {
        runtime: 'edge',
        platform: 'middleware',
      },
    },
  });

  console.log('[Sentry] Edge initialized in', ENVIRONMENT, 'mode');
}
