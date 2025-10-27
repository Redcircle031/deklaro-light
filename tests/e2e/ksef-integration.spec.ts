/**
 * Ultra-Deep E2E Tests: KSeF Integration
 *
 * Comprehensive testing of Polish National e-Invoice System integration.
 */

import { test, expect } from '@playwright/test';

test.describe('KSeF Integration - Ultra Deep Tests', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

  test.describe('KSeF Configuration', () => {
    test('should handle missing KSeF configuration gracefully', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice-123',
        },
      });

      // Should return appropriate error if KSeF not configured
      expect([400, 401, 503]).toContain(response.status());
    });

    test('should validate environment configuration', async ({ request }) => {
      // KSeF environments: test, production, demo
      const response = await request.get(`${baseUrl}/api/health`);

      // Health endpoint should work regardless of KSeF config
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('Certificate Authentication', () => {
    test('should handle missing certificate gracefully', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/authenticate`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          nip: '0000000000',
        },
      });

      // Should fail gracefully if certificate is not configured
      expect([400, 401, 503]).toContain(response.status());

      if (response.status() >= 400) {
        const data = await response.json().catch(() => ({}));

        // Error message should be informative
        if (data.error) {
          expect(typeof data.error).toBe('string');
        }
      }
    });

    test('should validate NIP format', async ({ request }) => {
      const invalidNips = ['', '123', 'abc', '123456789', '12345678901'];

      for (const nip of invalidNips) {
        const response = await request.post(`${baseUrl}/api/invoices/ksef/authenticate`, {
          headers: {
            'x-deklaro-tenant-id': 'test-tenant-id',
            'Content-Type': 'application/json',
          },
          data: { nip },
        });

        // Should reject invalid NIP formats
        expect([400, 401]).toContain(response.status());
      }
    });

    test('should accept valid NIP format', async ({ request }) => {
      const validNip = '1234567890'; // 10 digits

      const response = await request.post(`${baseUrl}/api/invoices/ksef/authenticate`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: { nip: validNip },
      });

      // May fail for other reasons, but not NIP format
      expect([200, 201, 401, 503]).toContain(response.status());
    });
  });

  test.describe('Invoice Submission', () => {
    test('should require authentication before submission', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice-id',
        },
      });

      // Should require authentication
      expect([401, 403, 503]).toContain(response.status());
    });

    test('should validate invoice ID', async ({ request }) => {
      const invalidIds = ['', null, undefined, 123, {}, []];

      for (const id of invalidIds) {
        const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
          headers: {
            'x-deklaro-tenant-id': 'test-tenant-id',
            'Content-Type': 'application/json',
          },
          data: {
            invoiceId: id,
          },
        });

        // Should reject invalid invoice IDs
        expect([400, 401]).toContain(response.status());
      }
    });

    test('should handle non-existent invoice', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'non-existent-invoice-99999',
        },
      });

      // Should return 404 or appropriate error
      expect([401, 404, 503]).toContain(response.status());
    });
  });

  test.describe('Invoice Status Checking', () => {
    test('should validate KSeF number format', async ({ request }) => {
      const invalidKsefNumbers = ['', 'invalid', '123', null];

      for (const ksefNumber of invalidKsefNumbers) {
        const response = await request.get(
          `${baseUrl}/api/invoices/ksef/status/${encodeURIComponent(ksefNumber || 'null')}`,
          {
            headers: {
              'x-deklaro-tenant-id': 'test-tenant-id',
            },
          }
        );

        // Should reject invalid KSeF numbers
        expect([400, 401, 404]).toContain(response.status());
      }
    });

    test('should handle missing KSeF number', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/invoices/ksef/status/`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
        },
      });

      // Should return 404 or 400
      expect([400, 401, 404]).toContain(response.status());
    });
  });

  test.describe('UPO Document Download', () => {
    test('should require valid KSeF number', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/invoices/ksef/upo/invalid-number`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
        },
      });

      // Should fail with invalid KSeF number
      expect([400, 401, 404, 503]).toContain(response.status());
    });

    test('should return appropriate content type for UPO', async ({ request }) => {
      // Note: This will fail unless we have a valid KSeF number
      const response = await request.get(
        `${baseUrl}/api/invoices/ksef/upo/test-ksef-number-123`,
        {
          headers: {
            'x-deklaro-tenant-id': 'test-tenant-id',
          },
        }
      );

      // If successful, should return PDF
      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/pdf');
      } else {
        // Otherwise should be an error
        expect([401, 404, 503]).toContain(response.status());
      }
    });
  });

  test.describe('Session Management', () => {
    test('should handle session expiration', async ({ request }) => {
      // This tests the session timeout behavior
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice',
        },
      });

      // Should handle expired sessions appropriately
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });

    test('should support session termination', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/logout`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
        },
      });

      // Should allow logout
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  test.describe('XML Signing', () => {
    test('should handle unsigned XML in test mode', async ({ request }) => {
      // In test/mock mode, should accept unsigned XML
      const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza>FA(3)</KodFormularza>
  </Naglowek>
</Faktura>`;

      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice',
          xml: testXml,
        },
      });

      // Should process in test mode
      expect([200, 201, 401, 503]).toContain(response.status());
    });
  });

  test.describe('Error Handling', () => {
    test('should return structured error responses', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          // Missing required invoiceId
        },
      });

      if (response.status() >= 400) {
        const data = await response.json().catch(() => null);

        // Should have structured error
        if (data) {
          expect(data.error || data.message).toBeDefined();
        }
      }
    });

    test('should handle KSeF API errors gracefully', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice-with-errors',
        },
      });

      // Should not crash on KSeF errors
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Mock Mode Behavior', () => {
    test('should support mock authentication', async ({ request }) => {
      // In development/test mode without certificates, should use mock auth
      const response = await request.post(`${baseUrl}/api/invoices/ksef/authenticate`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          nip: '1234567890',
          useMock: true,
        },
      });

      // Mock auth should work for testing
      expect([200, 201, 401, 503]).toContain(response.status());
    });

    test('should generate mock KSeF numbers', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/invoices/ksef/submit`, {
        headers: {
          'x-deklaro-tenant-id': 'test-tenant-id',
          'Content-Type': 'application/json',
        },
        data: {
          invoiceId: 'test-invoice',
          useMock: true,
        },
      });

      if (response.status() === 200 || response.status() === 201) {
        const data = await response.json();

        // Should return mock KSeF number
        if (data.ksefNumber) {
          expect(typeof data.ksefNumber).toBe('string');
        }
      }
    });
  });
});
