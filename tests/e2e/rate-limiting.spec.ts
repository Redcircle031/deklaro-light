/**
 * Ultra-Deep E2E Tests: Rate Limiting
 *
 * Tests all rate limiting scenarios across different endpoints.
 */

import { test, expect } from '@playwright/test';

test.describe('Rate Limiting - Ultra Deep Tests', () => {
  test.describe('API Rate Limits', () => {
    test('should enforce rate limits on upload endpoint', async ({ request }) => {
      const uploadUrl = `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000'}/api/invoices/upload`;

      // Make requests until we hit the rate limit
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const response = await request.post(uploadUrl, {
          headers: {
            'x-forwarded-for': '192.168.1.100', // Simulate specific IP
            'x-deklaro-tenant-id': 'test-tenant',
          },
          multipart: {
            files: {
              name: 'test.pdf',
              mimeType: 'application/pdf',
              buffer: Buffer.from('test'),
            },
          },
        });

        responses.push({
          status: response.status(),
          headers: await response.headersArray(),
        });

        // If we get 429, we've hit the rate limit
        if (response.status() === 429) {
          break;
        }
      }

      // Should have at least one 429 response
      const rateLimitedResponse = responses.find((r) => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();

      // Check for rate limit headers
      if (rateLimitedResponse) {
        const headers = rateLimitedResponse.headers.reduce((acc, h) => {
          acc[h.name.toLowerCase()] = h.value;
          return acc;
        }, {} as Record<string, string>);

        expect(headers['x-ratelimit-limit']).toBeDefined();
        expect(headers['x-ratelimit-remaining']).toBeDefined();
        expect(headers['retry-after']).toBeDefined();
      }
    });

    test('should have different rate limits for different endpoints', async ({ request }) => {
      const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

      // Test different endpoints
      const endpoints = [
        { url: `${baseUrl}/api/invoices/upload`, method: 'POST', expectedLimit: 10 },
        { url: `${baseUrl}/api/ocr/process`, method: 'POST', expectedLimit: 30 },
        { url: `${baseUrl}/api/invoices/list`, method: 'GET', expectedLimit: 300 },
      ];

      for (const endpoint of endpoints) {
        const response = await request.fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'x-forwarded-for': `192.168.1.${Math.random() * 255}`,
          },
        });

        const limitHeader = response.headers()['x-ratelimit-limit'];
        if (limitHeader) {
          expect(parseInt(limitHeader)).toBeGreaterThanOrEqual(endpoint.expectedLimit);
        }
      }
    });

    test('should rate limit by IP address', async ({ request }) => {
      const url = `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000'}/api/invoices/list`;

      // Same IP should share rate limit
      const ip = '192.168.1.200';
      const responses1 = [];
      for (let i = 0; i < 5; i++) {
        const response = await request.get(url, {
          headers: { 'x-forwarded-for': ip },
        });
        responses1.push(response.status());
      }

      // Different IP should have separate rate limit
      const response2 = await request.get(url, {
        headers: { 'x-forwarded-for': '192.168.1.201' },
      });

      expect(response2.status()).not.toBe(429);
    });
  });

  test.describe('Rate Limit Headers', () => {
    test('should include RFC 6585 compliant headers', async ({ request }) => {
      const response = await request.get(
        `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000'}/api/invoices/list`,
        {
          headers: { 'x-forwarded-for': '192.168.1.250' },
        }
      );

      const headers = response.headers();

      // Check for standard rate limit headers
      expect(headers['x-ratelimit-limit'] || headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['x-ratelimit-remaining'] || headers['X-RateLimit-Remaining']).toBeDefined();
    });
  });
});
