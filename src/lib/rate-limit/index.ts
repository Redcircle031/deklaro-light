/**
 * Rate Limiting Module
 *
 * Provides flexible rate limiting for API endpoints.
 *
 * @example Basic usage
 * ```typescript
 * import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
 *
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   RATE_LIMITS.UPLOAD,
 *   'invoice-upload'
 * );
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * import { withRateLimit } from '@/lib/rate-limit';
 *
 * export const POST = withRateLimit(
 *   handler,
 *   {
 *     maxRequests: 50,
 *     windowMs: 60 * 1000, // 1 minute
 *     strategy: 'tenant',
 *     skip: (req) => req.headers.get('x-admin-key') === process.env.ADMIN_KEY,
 *   },
 *   'custom-endpoint'
 * );
 * ```
 */

export { checkRateLimit, createRateLimitResponse, getRateLimitHeaders, RATE_LIMITS } from './limiter';
export type { RateLimitConfig, RateLimitResult } from './limiter';
export { withRateLimit, createRateLimitedHandler } from './middleware';
export { rateLimitStore } from './in-memory-store';
