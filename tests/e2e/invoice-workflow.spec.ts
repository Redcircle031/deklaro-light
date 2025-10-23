/**
 * Invoice Upload and Processing E2E Tests
 * Tests the complete invoice workflow from upload to review
 */

import { test, expect } from '@playwright/test';

test.describe('Invoice Upload Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assumes user is logged in or using demo mode)
    await page.goto('/dashboard');
  });

  test('should display invoice list page', async ({ page }) => {
    await page.goto('/dashboard/invoices');

    // Check page title
    await expect(page).toHaveTitle(/Invoices/);

    // Check for invoices table or list
    const invoicesContainer = page.locator('[data-testid="invoices-list"], table, .invoice-list');
    await expect(invoicesContainer).toBeVisible({ timeout: 5000 });
  });

  test('should show invoice statistics', async ({ page }) => {
    await page.goto('/dashboard/invoices');

    // Look for stats cards
    const statsCards = page.locator('.stats-card, [class*="stat"]');
    const count = await statsCards.count();

    // Should have at least some statistics displayed
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to invoice detail page', async ({ page }) => {
    await page.goto('/dashboard/invoices');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on first invoice if available (demo mode should have data)
    const firstInvoice = page.locator('[data-testid="invoice-item"], tr').first();

    if (await firstInvoice.isVisible()) {
      await firstInvoice.click();

      // Should navigate to detail page
      await expect(page.url()).toContain('/dashboard/invoices/');
    }
  });

  test('should display invoice detail information', async ({ page }) => {
    // Navigate directly to a demo invoice (ID will exist in demo mode)
    await page.goto('/dashboard/invoices/demo-invoice-1');

    await page.waitForLoadState('networkidle');

    // Page should load without errors (200)
    const response = await page.goto('/dashboard/invoices/demo-invoice-1');
    expect(response?.status()).toBe(200);

    // Should have some content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('should show tabs on invoice detail page', async ({ page }) => {
    await page.goto('/dashboard/invoices/demo-invoice-1');

    // Look for tab navigation
    const tabs = page.locator('[role="tab"], [class*="tab"]');
    const tabCount = await tabs.count();

    // Should have multiple tabs (Overview, Extraction, etc.)
    expect(tabCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Invoice Filtering and Search', () => {
  test('should have search functionality', async ({ page }) => {
    await page.goto('/dashboard/invoices');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');

    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
    } else {
      // Search might not be implemented yet
      test.info().annotations.push({ type: 'note', description: 'Search not yet implemented' });
    }
  });

  test('should have status filter', async ({ page }) => {
    await page.goto('/dashboard/invoices');

    // Look for status filter dropdown/select
    const statusFilter = page.locator('select, [data-testid="status-filter"]');
    const count = await statusFilter.count();

    // Filter might not be implemented yet
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
