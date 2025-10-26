/**
 * Rate Limiter
 *
 * Flexible rate limiting for API endpoints.
 * Supports multiple strategies: IP-based, tenant-based, user-based.
 */

import { NextRequest } from 'next/server';
import { rateLimitStore } from './in-memory-store';
import { getClientIp } from '@/lib/audit/logger';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Rate limit strategy
   * - 'ip': Limit by IP address
   * - 'tenant': Limit by tenant ID (from headers)
   * - 'user': Limit by user ID (from auth)
   * - 'combined': Limit by IP + tenant combined
   */
  strategy?: 'ip' | 'tenant' | 'user' | 'combined';

  /**
   * Custom key generator function
   */
  keyGenerator?: (request: NextRequest) => string | null;

  /**
   * Skip rate limiting for certain requests
   */
  skip?: (request: NextRequest) => boolean;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Current request count
   */
  current: number;

  /**
   * Maximum allowed requests
   */
  limit: number;

  /**
   * Remaining requests in the current window
   */
  remaining: number;

  /**
   * Time (in seconds) until the rate limit resets
   */
  resetIn: number;

  /**
   * Timestamp when the rate limit resets
   */
  resetAt: Date;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // File upload endpoints - strict limits
  UPLOAD: {
    maxRequests: 10, // 10 uploads per 15 minutes
    windowMs: 15 * 60 * 1000,
    strategy: 'tenant' as const,
  },

  // OCR processing - moderate limits
  OCR: {
    maxRequests: 30, // 30 OCR requests per 5 minutes
    windowMs: 5 * 60 * 1000,
    strategy: 'tenant' as const,
  },

  // General API endpoints - generous limits
  API: {
    maxRequests: 100, // 100 requests per minute
    windowMs: 60 * 1000,
    strategy: 'ip' as const,
  },

  // Authentication endpoints - very strict
  AUTH: {
    maxRequests: 5, // 5 login attempts per 15 minutes
    windowMs: 15 * 60 * 1000,
    strategy: 'ip' as const,
  },

  // Read-only endpoints - very generous
  READ: {
    maxRequests: 300, // 300 requests per minute
    windowMs: 60 * 1000,
    strategy: 'tenant' as const,
  },
} as const;

/**
 * Generate a rate limit key based on strategy
 */
function generateKey(
  request: NextRequest,
  prefix: string,
  strategy: 'ip' | 'tenant' | 'user' | 'combined' = 'ip'
): string | null {
  const parts: string[] = [prefix];

  switch (strategy) {
    case 'ip': {
      const ip = getClientIp(request.headers);
      if (!ip) return null;
      parts.push(ip);
      break;
    }

    case 'tenant': {
      const tenantId = request.headers.get('x-deklaro-tenant-id');
      if (!tenantId) return null;
      parts.push(tenantId);
      break;
    }

    case 'user': {
      // User ID would need to be extracted from auth token
      // For now, fall back to IP
      const ip = getClientIp(request.headers);
      if (!ip) return null;
      parts.push(ip);
      break;
    }

    case 'combined': {
      const ip = getClientIp(request.headers);
      const tenantId = request.headers.get('x-deklaro-tenant-id');
      if (!ip && !tenantId) return null;
      if (ip) parts.push(`ip:${ip}`);
      if (tenantId) parts.push(`tenant:${tenantId}`);
      break;
    }
  }

  return parts.join(':');
}

/**
 * Check if a request is rate limited
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @param prefix - Unique prefix for this endpoint (e.g., 'upload', 'ocr')
 * @returns Rate limit result
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  prefix: string
): Promise<RateLimitResult> {
  // Skip if configured to skip
  if (config.skip?.(request)) {
    return {
      allowed: true,
      current: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetIn: 0,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }

  // Generate key
  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : generateKey(request, prefix, config.strategy);

  if (!key) {
    console.warn('[RateLimit] Could not generate rate limit key, allowing request');
    return {
      allowed: true,
      current: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetIn: 0,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }

  // Increment counter
  const { count, resetAt } = rateLimitStore.increment(key, config.windowMs);

  const now = Date.now();
  const resetIn = Math.ceil((resetAt - now) / 1000);
  const allowed = count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);

  const result: RateLimitResult = {
    allowed,
    current: count,
    limit: config.maxRequests,
    remaining,
    resetIn,
    resetAt: new Date(resetAt),
  };

  // Log if rate limited
  if (!allowed) {
    console.warn(
      `[RateLimit] Request blocked - Key: ${key}, Count: ${count}/${config.maxRequests}, Reset in: ${resetIn}s`
    );
  }

  return result;
}

/**
 * Rate limit response headers (RFC 6585)
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
    'Retry-After': result.resetIn.toString(),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${result.resetIn} seconds.`,
      limit: result.limit,
      current: result.current,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result),
      },
    }
  );
}
