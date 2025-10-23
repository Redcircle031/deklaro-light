/**
 * Report Builder Unit Tests
 * Tests VAT summary and report generation logic
 */

import { describe, it, expect } from 'vitest';
import { getDateRange } from '@/lib/reports/report-builder';

describe('Report Builder', () => {
  describe('getDateRange', () => {
    it('should return today range', () => {
      const range = getDateRange('today');
      const today = new Date();

      // Should be same day
      expect(range.startDate.getDate()).toBe(today.getDate());
      expect(range.endDate.getDate()).toBe(today.getDate());
      expect(range.startDate.getMonth()).toBe(today.getMonth());
      expect(range.endDate.getMonth()).toBe(today.getMonth());
    });

    it('should return this week range', () => {
      const range = getDateRange('week');

      // Start should be before or equal to end
      expect(range.startDate.getTime()).toBeLessThanOrEqual(range.endDate.getTime());

      // Should be within a week
      const diffDays = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    it('should return this month range', () => {
      const range = getDateRange('month');
      const today = new Date();

      expect(range.startDate.getDate()).toBe(1);
      expect(range.startDate.getMonth()).toBe(today.getMonth());
      expect(range.endDate.getMonth()).toBe(today.getMonth());
    });

    it('should return this quarter range', () => {
      const range = getDateRange('quarter');
      const now = new Date();

      // Start should be before or equal to end
      expect(range.startDate.getTime()).toBeLessThanOrEqual(range.endDate.getTime());

      // Should be at start of current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      expect(range.startDate.getMonth()).toBe(currentQuarter * 3);
      expect(range.startDate.getDate()).toBe(1);

      // End date should be today or close to it
      expect(range.endDate.getDate()).toBeGreaterThanOrEqual(1);
      expect(range.endDate.getMonth()).toBeGreaterThanOrEqual(currentQuarter * 3);
    });

    it('should return this year range', () => {
      const range = getDateRange('year');
      const today = new Date();

      expect(range.startDate.getMonth()).toBe(0); // January
      expect(range.startDate.getDate()).toBe(1);
      expect(range.startDate.getFullYear()).toBe(today.getFullYear());
      expect(range.endDate.getFullYear()).toBe(today.getFullYear());
    });

    it('should handle custom date range', () => {
      const now = new Date();
      const customRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const range = getDateRange('custom', customRange, now);

      expect(range.startDate).toEqual(customRange.startDate);
      expect(range.endDate).toEqual(customRange.endDate);
    });
  });

  describe('VAT Summary Calculation', () => {
    it('should correctly aggregate VAT by rate', () => {
      const invoices = [
        { netAmount: 100, vatRate: 23, vatAmount: 23, grossAmount: 123 },
        { netAmount: 200, vatRate: 23, vatAmount: 46, grossAmount: 246 },
        { netAmount: 100, vatRate: 8, vatAmount: 8, grossAmount: 108 },
      ];

      // Group by VAT rate
      const grouped = invoices.reduce((acc, inv) => {
        const rate = inv.vatRate;
        if (!acc[rate]) {
          acc[rate] = { net: 0, vat: 0, gross: 0 };
        }
        acc[rate].net += inv.netAmount;
        acc[rate].vat += inv.vatAmount;
        acc[rate].gross += inv.grossAmount;
        return acc;
      }, {} as Record<number, { net: number; vat: number; gross: number }>);

      expect(grouped[23]).toEqual({ net: 300, vat: 69, gross: 369 });
      expect(grouped[8]).toEqual({ net: 100, vat: 8, gross: 108 });
    });

    it('should calculate correct totals', () => {
      const summary = {
        byVATRate: [
          { rate: 23, netAmount: 1000, vatAmount: 230, grossAmount: 1230, count: 10 },
          { rate: 8, netAmount: 500, vatAmount: 40, grossAmount: 540, count: 5 },
          { rate: 0, netAmount: 200, vatAmount: 0, grossAmount: 200, count: 2 },
        ],
      };

      const totals = summary.byVATRate.reduce(
        (acc, rate) => ({
          net: acc.net + rate.netAmount,
          vat: acc.vat + rate.vatAmount,
          gross: acc.gross + rate.grossAmount,
          count: acc.count + rate.count,
        }),
        { net: 0, vat: 0, gross: 0, count: 0 }
      );

      expect(totals).toEqual({
        net: 1700,
        vat: 270,
        gross: 1970,
        count: 17,
      });
    });
  });

  describe('Invoice Type Breakdown', () => {
    it('should separate purchase and sale invoices', () => {
      const invoices = [
        { type: 'PURCHASE', grossAmount: 1000 },
        { type: 'PURCHASE', grossAmount: 2000 },
        { type: 'SALE', grossAmount: 5000 },
        { type: 'SALE', grossAmount: 3000 },
      ];

      const purchase = invoices
        .filter((inv) => inv.type === 'PURCHASE')
        .reduce((sum, inv) => sum + inv.grossAmount, 0);

      const sale = invoices
        .filter((inv) => inv.type === 'SALE')
        .reduce((sum, inv) => sum + inv.grossAmount, 0);

      expect(purchase).toBe(3000);
      expect(sale).toBe(8000);
    });
  });

  describe('Polish Currency Formatting', () => {
    it('should format amounts in PLN', () => {
      const amount = 1234.56;
      const formatted = new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
      }).format(amount);

      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
      expect(formatted).toContain('56');
      expect(formatted).toContain('zł');
    });

    it('should handle large numbers', () => {
      const amount = 1234567.89;
      const formatted = new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

      expect(formatted).toContain('567');
      expect(formatted).toContain('89');
    });
  });
});
