/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the server-side (API routes, SSR, etc.).
 * It will capture errors and performance data on the server.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_ENABLED = process.env.SENTRY_ENABLED === 'true';

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: ENVIRONMENT,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      Sentry.httpIntegration(),
      Sentry.prismaIntegration(),
    ],

    // Ignore certain errors
    ignoreErrors: [
      // Database connection errors (temporary)
      'ECONNREFUSED',
      'ETIMEDOUT',
      // Common non-critical errors
      'AbortError',
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive environment variables
      if (event.contexts?.app?.app_start_time) {
        delete event.contexts.app.app_start_time;
      }

      // Remove sensitive request data
      if (event.request) {
        delete event.request?.cookies;

        // Mask authorization headers
        if (event.request.headers) {
          Object.keys(event.request.headers).forEach((key) => {
            if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
              event.request!.headers![key] = '[Filtered]';
            }
          });
        }

        // Mask sensitive query params
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          const maskedParams = ['token', 'apiKey', 'api_key', 'password', 'secret'];
          maskedParams.forEach((param) => {
            if (typeof event.request?.query_string === 'string' && event.request.query_string.includes(param)) {
              event.request.query_string = event.request.query_string.replace(
                new RegExp(`${param}=[^&]*`, 'gi'),
                `${param}=[Filtered]`
              );
            }
          });
        }
      }

      // Remove sensitive breadcrumb data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.category === 'console') {
            // Filter console logs that might contain sensitive data
            if (breadcrumb.message?.includes('password') || breadcrumb.message?.includes('token')) {
              breadcrumb.message = '[Filtered]';
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Add tags for better filtering
    initialScope: {
      tags: {
        runtime: 'nodejs',
        platform: 'server',
      },
    },
  });

  console.log('[Sentry] Server initialized in', ENVIRONMENT, 'mode');
} else {
  if (ENVIRONMENT === 'production') {
    console.warn('[Sentry] Server not initialized - DSN missing or disabled');
  }
}
