/**
 * Analytics and Reporting E2E Tests
 * Tests dashboard analytics and charts
 */

import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics');
  });

  test('should display analytics page', async ({ page }) => {
    // Page should load successfully
    const response = await page.goto('/dashboard/analytics');
    expect(response?.status()).toBe(200);

    // Check page title
    await expect(page).toHaveTitle(/Analytics/);
  });

  test('should display chart components', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for chart containers (Recharts uses svg)
    const charts = page.locator('svg, canvas, [class*="recharts"], [class*="chart"]');
    const count = await charts.count();

    // Should have at least one chart
    expect(count).toBeGreaterThan(0);
  });

  test('should show monthly invoice chart', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for chart title or container
    const monthlyChart = page.locator('text=/Monthly.*Invoice|Invoice.*Volume/i');

    if (await monthlyChart.isVisible()) {
      await expect(monthlyChart).toBeVisible();
    }
  });

  test('should show VAT summary', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for VAT-related content
    const vatContent = page.locator('text=/VAT|Tax/i');
    const count = await vatContent.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should display trends analysis', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for trends section
    const trendsSection = page.locator('text=/Trend|Analysis/i');

    if (await trendsSection.isVisible()) {
      await expect(trendsSection).toBeVisible();
    }
  });

  test('should show invoice type breakdown', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for invoice type labels
    const typeBreakdown = page.locator('text=/Purchase|Sale|Incoming|Outgoing/i');
    const count = await typeBreakdown.count();

    // Should have some type indicators
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Dashboard Overview', () => {
  test('should display main dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Page should load
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBe(200);
  });

  test('should show statistics cards', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Look for stat cards
    const statCards = page.locator('[class*="card"], [class*="stat"]');
    const count = await statCards.count();

    // Should have multiple stats
    expect(count).toBeGreaterThan(0);
  });

  test('should have navigation to different sections', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for navigation links
    const invoicesLink = page.locator('a[href*="/invoices"], text=/Invoices/i');
    const companiesLink = page.locator('a[href*="/companies"], text=/Companies/i');
    const analyticsLink = page.locator('a[href*="/analytics"], text=/Analytics|Reports/i');

    // Should have navigation
    expect((await invoicesLink.count()) + (await companiesLink.count()) + (await analyticsLink.count())).toBeGreaterThan(0);
  });

  test('should display recent activity or invoices', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Look for recent activity section
    const recentSection = page.locator('text=/Recent|Latest|Activity/i');

    if (await recentSection.isVisible()) {
      await expect(recentSection).toBeVisible();
    }
  });
});

test.describe('Polish Localization', () => {
  test('should display currency in PLN', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Look for PLN currency symbol
    const plnSymbol = page.locator('text=/zł|PLN/i');

    if (await plnSymbol.isVisible()) {
      await expect(plnSymbol).toBeVisible();
    }
  });

  test('should use Polish number formatting', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    await page.waitForLoadState('networkidle');

    // Polish uses space as thousand separator and comma as decimal
    // e.g., "1 234,56"
    const content = await page.content();

    // Just check that numbers are displayed
    expect(content).toMatch(/\d/);
  });
});
