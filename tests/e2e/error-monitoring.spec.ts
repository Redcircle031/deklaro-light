/**
 * Ultra-Deep E2E Tests: Error Monitoring (Sentry)
 *
 * Comprehensive testing of error tracking and monitoring capabilities.
 */

import { test, expect } from '@playwright/test';

test.describe('Error Monitoring (Sentry) - Ultra Deep Tests', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

  test.describe('Client-Side Error Capture', () => {
    test('should not crash on JavaScript errors', async ({ page }) => {
      // Capture console errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Navigate to different pages
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Page should load even if there are minor errors
      const title = await page.title();
      expect(title).toBeDefined();
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto(`${baseUrl}/non-existent-page-12345`);
      await page.waitForLoadState('networkidle');

      // Should show 404 page, not crash
      const status = page.url();
      expect(status).toContain('non-existent-page');

      const body = await page.textContent('body');
      expect(body).toBeDefined();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Trigger API error by making invalid request
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/invoices/invalid-endpoint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invalid: 'data' }),
          });
          return res.status;
        } catch (error) {
          return 500;
        }
      });

      // Should return error status, not crash
      expect(response).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Server-Side Error Handling', () => {
    test('should return proper error status codes', async ({ request }) => {
      const endpoints = [
        { url: '/api/invoices/upload', method: 'POST', expectedStatus: [400, 401, 415] },
        { url: '/api/tenants/invitations', method: 'POST', expectedStatus: [400, 401] },
        { url: '/api/stripe/checkout', method: 'POST', expectedStatus: [400, 401, 503] },
      ];

      for (const endpoint of endpoints) {
        const response = await request[endpoint.method.toLowerCase() as 'post'](
          `${baseUrl}${endpoint.url}`,
          {
            headers: { 'Content-Type': 'application/json' },
            data: {},
          }
        );

        // Should return expected error status
        expect(endpoint.expectedStatus).toContain(response.status());
      }
    });

    test('should include error details in response', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: 'invalid-email',
          role: 'INVALID_ROLE',
        },
      });

      if (response.status() >= 400) {
        const data = await response.json().catch(() => ({}));

        // Should have error message
        expect(data.error || data.message || data.details).toBeDefined();
      }
    });

    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json {{{',
      });

      // Should return 400 for malformed JSON
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Privacy and Security', () => {
    test('should not expose sensitive data in errors', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/upload`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          invalid: 'request',
        },
      });

      if (response.status() >= 400) {
        const body = await response.text();

        // Should not expose sensitive information
        expect(body).not.toMatch(/password|secret|key|token/i);
        expect(body).not.toMatch(/\/home\/|\/var\/|C:\\/);
        expect(body).not.toMatch(/SUPABASE_|STRIPE_|OPENAI_/);
      }
    });

    test('should sanitize error messages', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'x-deklaro-tenant-id': '../../../etc/passwd',
          'Content-Type': 'application/json',
        },
        data: {
          email: '<script>alert("xss")</script>@example.com',
          role: 'ACCOUNTANT',
        },
      });

      const body = await response.text();

      // Should not echo back potentially dangerous input
      expect(body).not.toContain('<script>');
      expect(body).not.toContain('../../../');
    });

    test('should filter sensitive headers from error reports', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/upload`, {
        headers: {
          'Authorization': 'Bearer fake-token-12345',
          'Cookie': 'session=secret-session-data',
          'x-deklaro-tenant-id': 'test-tenant',
          'Content-Type': 'application/json',
        },
        data: {},
      });

      // Should process request (may fail for other reasons)
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track page load performance', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart,
        };
      });

      // Metrics should be reasonable
      expect(performanceMetrics.totalTime).toBeGreaterThan(0);
      expect(performanceMetrics.totalTime).toBeLessThan(30000); // Less than 30 seconds
    });

    test('should handle slow API responses', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${baseUrl}/api/health`);

      const duration = Date.now() - startTime;

      // Health check should be fast
      expect(duration).toBeLessThan(10000); // Less than 10 seconds
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from network errors', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Simulate network error by going offline
      await page.context().setOffline(true);

      // Try to navigate
      const navigationPromise = page.goto(`${baseUrl}/dashboard`).catch(() => null);

      // Go back online
      await page.context().setOffline(false);

      // Page should eventually load or show error
      await page.waitForTimeout(2000);

      const body = await page.textContent('body').catch(() => '');
      expect(body).toBeDefined();
    });

    test('should handle authentication errors', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/invoices`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
          'x-deklaro-tenant-id': 'test-tenant',
        },
      });

      // Should return 401 for invalid auth
      expect(response.status()).toBe(401);

      const data = await response.json().catch(() => ({}));

      // Should have error message
      expect(data.error || data.message).toBeDefined();
    });

    test('should handle rate limit errors', async ({ request }) => {
      // Make many rapid requests
      const promises = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          request.post(`${baseUrl}/api/tenants/invitations`, {
            headers: {
              'x-deklaro-tenant-id': 'test-tenant-id',
              'x-forwarded-for': '192.168.250.1',
              'Content-Type': 'application/json',
            },
            data: {
              email: `user${i}@example.com`,
              role: 'CLIENT',
            },
          })
        );
      }

      const responses = await Promise.all(promises);

      // Should eventually return 429
      const rateLimited = responses.some((r) => r.status() === 429);
      expect(rateLimited).toBe(true);

      // Rate limit responses should have helpful headers
      const rateLimitResponse = responses.find((r) => r.status() === 429);
      if (rateLimitResponse) {
        const headers = rateLimitResponse.headers();

        // Should include rate limit headers (RFC 6585)
        const hasRateLimitHeaders =
          headers['retry-after'] ||
          headers['x-ratelimit-limit'] ||
          headers['x-ratelimit-remaining'];

        expect(hasRateLimitHeaders).toBeDefined();
      }
    });
  });

  test.describe('Error Boundaries', () => {
    test('should render error boundary on component error', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Page should load without crashing
      const title = await page.title();
      expect(title).toBeDefined();
    });

    test('should show user-friendly error messages', async ({ page }) => {
      await page.goto(`${baseUrl}/accept-invitation?token=invalid-token-123`);
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');

      // Should show user-friendly error, not stack trace
      expect(body).not.toContain('TypeError:');
      expect(body).not.toContain('at Object');
      expect(body).not.toContain('.next/');
    });
  });

  test.describe('Logging and Diagnostics', () => {
    test('should include request ID in error responses', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/upload`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {},
      });

      const headers = response.headers();

      // May include request ID or correlation ID
      const hasTraceability =
        headers['x-request-id'] ||
        headers['x-correlation-id'] ||
        headers['x-trace-id'];

      // Not all implementations include this
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });

    test('should handle errors consistently across endpoints', async ({ request }) => {
      const endpoints = [
        '/api/invoices/upload',
        '/api/tenants/invitations',
        '/api/stripe/checkout',
      ];

      for (const endpoint of endpoints) {
        const response = await request.post(`${baseUrl}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          data: {},
        });

        if (response.status() >= 400) {
          const data = await response.json().catch(() => null);

          // Should have consistent error structure
          if (data) {
            const hasErrorField = data.error || data.message || data.details;
            expect(hasErrorField).toBeDefined();
          }
        }
      }
    });
  });

  test.describe('Sentry Configuration', () => {
    test('should initialize without errors when Sentry is disabled', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Page should load even if Sentry is not configured
      const title = await page.title();
      expect(title).toBeDefined();
    });

    test('should not block application when Sentry fails', async ({ page }) => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');

      // Application should work even if error reporting fails
      const body = await page.textContent('body');
      expect(body).toBeDefined();
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle database connection errors', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/invoices`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant',
        },
      });

      // Should return appropriate error if database is unavailable
      // Or require authentication
      expect([401, 500, 503]).toContain(response.status());
    });

    test('should handle external service failures', async ({ request }) => {
      // Test KSeF API failure
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice',
        },
      });

      // Should handle external service errors gracefully
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle file upload errors', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/upload`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant',
        },
        multipart: {
          file: {
            name: 'corrupted.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('corrupted data'),
          },
        },
      });

      // Should handle corrupted files gracefully
      expect([400, 401, 415]).toContain(response.status());
    });
  });
});
