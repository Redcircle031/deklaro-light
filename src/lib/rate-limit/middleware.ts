/**
 * Rate Limit Middleware
 *
 * Wrapper to easily apply rate limiting to API route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse, getRateLimitHeaders, RateLimitConfig } from './limiter';

type RouteHandler = (request: NextRequest, context?: any) => Promise<Response> | Response;

/**
 * Wrap an API route handler with rate limiting
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     maxRequests: 10,
 *     windowMs: 60 * 1000, // 1 minute
 *     strategy: 'tenant',
 *   },
 *   'my-endpoint'
 * );
 * ```
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig,
  prefix: string
): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, config, prefix);

    // If rate limited, return 429 response
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Call the actual handler
    const response = await handler(request, context);

    // Add rate limit headers to successful responses
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Create a rate-limited handler with preset configuration
 */
export function createRateLimitedHandler(
  handler: RouteHandler,
  presetName: keyof typeof import('./limiter').RATE_LIMITS,
  prefix: string
): RouteHandler {
  const { RATE_LIMITS } = require('./limiter');
  const config = RATE_LIMITS[presetName];
  return withRateLimit(handler, config, prefix);
}
