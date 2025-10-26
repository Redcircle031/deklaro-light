/**
 * Unit tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit, rateLimitStore, RATE_LIMITS } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear the rate limit store before each test
    rateLimitStore.resetAll();
  });

  afterEach(() => {
    rateLimitStore.resetAll();
  });

  describe('In-Memory Store', () => {
    it('should increment counter for new key', () => {
      const { count } = rateLimitStore.increment('test-key', 60000);
      expect(count).toBe(1);
    });

    it('should increment existing counter within window', () => {
      rateLimitStore.increment('test-key', 60000);
      const { count } = rateLimitStore.increment('test-key', 60000);
      expect(count).toBe(2);
    });

    it('should reset counter after window expires', async () => {
      // First increment with 100ms window
      const { count: count1 } = rateLimitStore.increment('test-key', 100);
      expect(count1).toBe(1);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should create new window
      const { count: count2 } = rateLimitStore.increment('test-key', 100);
      expect(count2).toBe(1);
    });

    it('should handle multiple keys independently', () => {
      rateLimitStore.increment('key-1', 60000);
      rateLimitStore.increment('key-1', 60000);
      rateLimitStore.increment('key-2', 60000);

      const key1Data = rateLimitStore.get('key-1');
      const key2Data = rateLimitStore.get('key-2');

      expect(key1Data?.count).toBe(2);
      expect(key2Data?.count).toBe(1);
    });

    it('should return null for expired or non-existent keys', () => {
      const data = rateLimitStore.get('non-existent');
      expect(data).toBeNull();
    });

    it('should reset specific key', () => {
      rateLimitStore.increment('test-key', 60000);
      expect(rateLimitStore.get('test-key')?.count).toBe(1);

      rateLimitStore.reset('test-key');
      expect(rateLimitStore.get('test-key')).toBeNull();
    });
  });

  describe('Rate Limit Checker', () => {
    function createMockRequest(
      ip: string = '127.0.0.1',
      tenantId: string | null = 'tenant-1'
    ): NextRequest {
      const headers = new Headers();
      headers.set('x-forwarded-for', ip);
      if (tenantId) {
        headers.set('x-deklaro-tenant-id', tenantId);
      }

      return new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers,
      });
    }

    it('should allow requests under the limit', async () => {
      const request = createMockRequest();
      const result = await checkRateLimit(
        request,
        { maxRequests: 5, windowMs: 60000, strategy: 'ip' },
        'test'
      );

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(4);
    });

    it('should block requests over the limit', async () => {
      const request = createMockRequest();
      const config = { maxRequests: 3, windowMs: 60000, strategy: 'ip' as const };

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(request, config, 'test');
      }

      // 4th request should be blocked
      const result = await checkRateLimit(request, config, 'test');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(4);
      expect(result.remaining).toBe(0);
    });

    it('should rate limit by tenant ID', async () => {
      const request1 = createMockRequest('1.1.1.1', 'tenant-1');
      const request2 = createMockRequest('2.2.2.2', 'tenant-1');
      const request3 = createMockRequest('3.3.3.3', 'tenant-2');

      const config = { maxRequests: 2, windowMs: 60000, strategy: 'tenant' as const };

      // Two requests from different IPs but same tenant
      await checkRateLimit(request1, config, 'test');
      const result2 = await checkRateLimit(request2, config, 'test');

      // Should count as 2 requests for tenant-1
      expect(result2.current).toBe(2);

      // Request from different tenant should have its own counter
      const result3 = await checkRateLimit(request3, config, 'test');
      expect(result3.current).toBe(1);
    });

    it('should rate limit by IP address', async () => {
      const request1 = createMockRequest('1.1.1.1', 'tenant-1');
      const request2 = createMockRequest('1.1.1.1', 'tenant-2');
      const request3 = createMockRequest('2.2.2.2', 'tenant-1');

      const config = { maxRequests: 2, windowMs: 60000, strategy: 'ip' as const };

      // Two requests from same IP but different tenants
      await checkRateLimit(request1, config, 'test');
      const result2 = await checkRateLimit(request2, config, 'test');

      // Should count as 2 requests for IP 1.1.1.1
      expect(result2.current).toBe(2);

      // Request from different IP should have its own counter
      const result3 = await checkRateLimit(request3, config, 'test');
      expect(result3.current).toBe(1);
    });

    it('should skip rate limiting when configured', async () => {
      const request = createMockRequest();
      const config = {
        maxRequests: 1,
        windowMs: 60000,
        strategy: 'ip' as const,
        skip: () => true, // Always skip
      };

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(request, config, 'test');
        expect(result.allowed).toBe(true);
      }
    });

    it('should use custom key generator', async () => {
      const request = createMockRequest();
      const config = {
        maxRequests: 2,
        windowMs: 60000,
        keyGenerator: () => 'custom-key',
      };

      // First request
      const result1 = await checkRateLimit(request, config, 'test');
      expect(result1.current).toBe(1);

      // Second request should use same key
      const result2 = await checkRateLimit(request, config, 'test');
      expect(result2.current).toBe(2);
    });

    it('should handle missing tenant ID gracefully', async () => {
      const request = createMockRequest('1.1.1.1', null);
      const config = { maxRequests: 5, windowMs: 60000, strategy: 'tenant' as const };

      const result = await checkRateLimit(request, config, 'test');

      // Should allow request even if tenant ID is missing
      expect(result.allowed).toBe(true);
    });

    it('should provide correct reset time information', async () => {
      const request = createMockRequest();
      const windowMs = 5000; // 5 seconds
      const config = { maxRequests: 5, windowMs, strategy: 'ip' as const };

      const beforeTime = Date.now();
      const result = await checkRateLimit(request, config, 'test');
      const afterTime = Date.now();

      // Reset time should be approximately windowMs in the future
      const resetTimeMs = result.resetAt.getTime();
      expect(resetTimeMs).toBeGreaterThanOrEqual(beforeTime + windowMs);
      expect(resetTimeMs).toBeLessThanOrEqual(afterTime + windowMs + 100); // 100ms tolerance

      // Reset in seconds should be approximately windowMs / 1000
      expect(result.resetIn).toBeGreaterThanOrEqual(Math.floor(windowMs / 1000) - 1);
      expect(result.resetIn).toBeLessThanOrEqual(Math.ceil(windowMs / 1000) + 1);
    });
  });

  describe('Rate Limit Presets', () => {
    it('should have UPLOAD preset with strict limits', () => {
      expect(RATE_LIMITS.UPLOAD.maxRequests).toBe(10);
      expect(RATE_LIMITS.UPLOAD.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RATE_LIMITS.UPLOAD.strategy).toBe('tenant');
    });

    it('should have OCR preset with moderate limits', () => {
      expect(RATE_LIMITS.OCR.maxRequests).toBe(30);
      expect(RATE_LIMITS.OCR.windowMs).toBe(5 * 60 * 1000); // 5 minutes
      expect(RATE_LIMITS.OCR.strategy).toBe('tenant');
    });

    it('should have API preset with generous limits', () => {
      expect(RATE_LIMITS.API.maxRequests).toBe(100);
      expect(RATE_LIMITS.API.windowMs).toBe(60 * 1000); // 1 minute
      expect(RATE_LIMITS.API.strategy).toBe('ip');
    });

    it('should have AUTH preset with very strict limits', () => {
      expect(RATE_LIMITS.AUTH.maxRequests).toBe(5);
      expect(RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RATE_LIMITS.AUTH.strategy).toBe('ip');
    });

    it('should have READ preset with very generous limits', () => {
      expect(RATE_LIMITS.READ.maxRequests).toBe(300);
      expect(RATE_LIMITS.READ.windowMs).toBe(60 * 1000); // 1 minute
      expect(RATE_LIMITS.READ.strategy).toBe('tenant');
    });
  });

  describe('Combined Strategy', () => {
    function createMockRequest(
      ip: string = '127.0.0.1',
      tenantId: string | null = 'tenant-1'
    ): NextRequest {
      const headers = new Headers();
      headers.set('x-forwarded-for', ip);
      if (tenantId) {
        headers.set('x-deklaro-tenant-id', tenantId);
      }

      return new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers,
      });
    }

    it('should rate limit by combined IP and tenant', async () => {
      const request1 = createMockRequest('1.1.1.1', 'tenant-1');
      const request2 = createMockRequest('1.1.1.1', 'tenant-2');
      const request3 = createMockRequest('2.2.2.2', 'tenant-1');

      const config = { maxRequests: 2, windowMs: 60000, strategy: 'combined' as const };

      // Request from IP1 + Tenant1
      const result1 = await checkRateLimit(request1, config, 'test');
      expect(result1.current).toBe(1);

      // Request from IP1 + Tenant2 (different combo)
      const result2 = await checkRateLimit(request2, config, 'test');
      expect(result2.current).toBe(1);

      // Request from IP2 + Tenant1 (different combo)
      const result3 = await checkRateLimit(request3, config, 'test');
      expect(result3.current).toBe(1);
    });
  });
});
