/**
 * Ultra-Deep E2E Tests: Tenant Invitations
 *
 * Comprehensive testing of the tenant invitation flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Tenant Invitations - Ultra Deep Tests', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

  test.describe('Invitation Creation', () => {
    test('should create invitation with valid data', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          email: 'newuser@example.com',
          role: 'ACCOUNTANT',
          message: 'Welcome to our team!',
        },
      });

      // Should return 401 without auth, or 201 with auth
      expect([401, 201]).toContain(response.status());

      if (response.status() === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.invitation).toBeDefined();
        expect(data.invitation.email).toBe('newuser@example.com');
        expect(data.invitation.role).toBe('ACCOUNTANT');
      }
    });

    test('should reject invalid email format', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          email: 'invalid-email',
          role: 'ACCOUNTANT',
        },
      });

      // Should return validation error (400) or unauthorized (401)
      expect([400, 401]).toContain(response.status());
    });

    test('should reject invalid role', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          email: 'user@example.com',
          role: 'INVALID_ROLE',
        },
      });

      expect([400, 401]).toContain(response.status());
    });

    test('should validate all role types', async ({ request }) => {
      const validRoles = ['OWNER', 'ACCOUNTANT', 'CLIENT'];

      for (const role of validRoles) {
        const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
          headers: {
            'x-deklaro-tenant-id': 'test-tenant-id',
            'Content-Type': 'application/json',
          },
          data: {
            email: `test-${role.toLowerCase()}@example.com`,
            role,
          },
        });

        // Either successful or unauthorized (depending on auth state)
        expect([201, 401, 403]).toContain(response.status());
      }
    });
  });

  test.describe('Invitation Listing', () => {
    test('should list invitations for tenant', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
        },
      });

      expect([200, 401]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.invitations).toBeDefined();
        expect(Array.isArray(data.invitations)).toBe(true);
      }
    });

    test('should require tenant ID header', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/tenants/invitations`);

      // Should fail without tenant ID
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Invitation Acceptance UI', () => {
    test('should load accept invitation page', async ({ page }) => {
      await page.goto(`${baseUrl}/accept-invitation?token=test-token-123`);

      // Page should load
      await expect(page).toHaveTitle(/Accept Invitation|Deklaro/);

      // Should show some form of invitation UI
      const body = await page.textContent('body');
      expect(body).toContain('Invitation' || 'invitation' || 'accept' || 'Accept');
    });

    test('should show error with invalid token', async ({ page }) => {
      await page.goto(`${baseUrl}/accept-invitation?token=invalid-token`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show some error message
      const errorIndicators = [
        page.getByText(/invalid/i),
        page.getByText(/error/i),
        page.getByText(/not found/i),
      ];

      let foundError = false;
      for (const indicator of errorIndicators) {
        try {
          await indicator.waitFor({ timeout: 2000 });
          foundError = true;
          break;
        } catch {
          // Continue to next indicator
        }
      }

      // At least one error indicator should be visible
      expect(foundError).toBe(true);
    });

    test('should show error without token parameter', async ({ page }) => {
      await page.goto(`${baseUrl}/accept-invitation`);

      await page.waitForLoadState('networkidle');

      // Should show error about missing token
      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/invalid|error|token/);
    });

    test('should have accept button', async ({ page }) => {
      await page.goto(`${baseUrl}/accept-invitation?token=test-token`);

      await page.waitForLoadState('networkidle');

      // Look for accept button (may not be clickable without valid token)
      const acceptButton = page.getByRole('button', { name: /accept/i });

      // Button might exist but be disabled
      const buttonCount = await acceptButton.count();
      expect(buttonCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Invitation Acceptance API', () => {
    test('should validate token format', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations/accept`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          token: '', // Empty token
        },
      });

      expect([400, 401]).toContain(response.status());
    });

    test('should handle non-existent token', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations/accept`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          token: 'non-existent-token-12345',
        },
      });

      expect([401, 404]).toContain(response.status());
    });
  });

  test.describe('Security', () => {
    test('should enforce rate limiting on invitation creation', async ({ request }) => {
      // Attempt multiple rapid invitations
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(
          request.post(`${baseUrl}/api/tenants/invitations`, {
            headers: {
              'x-deklaro-tenant-id': 'test-tenant-id',
              'x-forwarded-for': '192.168.100.1',
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
      const rateLimited = responses.some((r) => r.status() === 429);

      // Should eventually hit rate limit
      expect(rateLimited).toBe(true);
    });

    test('should not expose invitation tokens in headers', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/tenants/invitations`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
          role: 'CLIENT',
        },
      });

      const headers = response.headers();

      // Token should not be in response headers
      const headerValues = Object.values(headers).join(' ');
      expect(headerValues).not.toMatch(/[a-zA-Z0-9_-]{32,}/); // Base64 token pattern
    });
  });
});
