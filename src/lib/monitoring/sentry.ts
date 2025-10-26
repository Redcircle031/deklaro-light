/**
 * Sentry Monitoring Utilities
 *
 * Helper functions for error tracking and performance monitoring.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Set user context for Sentry
 * Call this after user logs in
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  tenantId?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenant_id: user.tenantId,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }

  Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb (useful for debugging)
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category: string = 'custom'
) {
  Sentry.addBreadcrumb({
    message,
    data,
    category,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Wrap an async function with error handling
 */
export function withSentryMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { name?: string; tags?: Record<string, string> }
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const transaction = context?.name
      ? Sentry.startTransaction({ name: context.name, op: 'function' })
      : null;

    if (context?.tags && transaction) {
      Object.entries(context.tags).forEach(([key, value]) => {
        transaction.setTag(key, value);
      });
    }

    try {
      const result = await fn(...args);
      transaction?.setStatus('ok');
      return result;
    } catch (error) {
      transaction?.setStatus('internal_error');
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction?.finish();
    }
  }) as T;
}

/**
 * Create a tagged scope for better error grouping
 */
export function withScope(callback: (scope: Sentry.Scope) => void) {
  return Sentry.withScope(callback);
}

/**
 * Track API route performance
 */
export async function trackAPIRoute<T>(
  routeName: string,
  handler: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name: routeName,
    op: 'http.server',
  });

  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      transaction.setTag(key, value);
    });
  }

  try {
    const result = await handler();
    transaction.setStatus('ok');
    transaction.setHttpStatus(200);
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    transaction.setHttpStatus(500);
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return (
    process.env.SENTRY_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
  );
}
