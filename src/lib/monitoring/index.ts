/**
 * Monitoring Module
 *
 * Provides error tracking and performance monitoring.
 */

export {
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  withSentryMonitoring,
  withScope,
  trackAPIRoute,
  isSentryEnabled,
} from './sentry';
