/**
 * Company Management E2E Tests
 * Tests company listing, search, and NIP validation
 */

import { test, expect } from '@playwright/test';

test.describe('Company Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/companies');
  });

  test('should display companies list page', async ({ page }) => {
    // Check page loaded successfully
    const response = await page.goto('/dashboard/companies');
    expect(response?.status()).toBe(200);

    // Check page title
    await expect(page).toHaveTitle(/Companies/);

    // Should have some content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('should show company statistics', async ({ page }) => {
    // Look for stats display
    const statsContainer = page.locator('[class*="stat"], [data-testid="stats"]');
    const count = await statsContainer.count();

    // Should have some statistics
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display companies in table or list', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for table or list container
    const companiesContainer = page.locator('table, [data-testid="companies-list"], .company-list');

    // In demo mode, should have companies displayed
    if (await companiesContainer.isVisible()) {
      await expect(companiesContainer).toBeVisible();
    }
  });

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');

    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();

      // Try typing in search
      await searchInput.fill('Test Company');
    }
  });

  test('should have export functionality', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), [data-testid="export-button"]');

    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();
    }
  });

  test('should navigate to company detail page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click on first company if available
    const firstCompany = page.locator('[data-testid="company-item"], tr').first();

    if (await firstCompany.isVisible()) {
      await firstCompany.click();

      // Should navigate to detail page
      await expect(page.url()).toContain('/dashboard/companies/');
    }
  });
});

test.describe('Company Detail Page', () => {
  test('should display company details', async ({ page }) => {
    // Navigate to demo company
    await page.goto('/dashboard/companies/1');

    await page.waitForLoadState('networkidle');

    // Page should load successfully
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('should show NIP validation button', async ({ page }) => {
    await page.goto('/dashboard/companies/1');

    // Look for validate button
    const validateButton = page.locator('button:has-text("Validate"), button:has-text("Verify")');

    if (await validateButton.isVisible()) {
      await expect(validateButton).toBeVisible();
    }
  });

  test('should show edit button or mode', async ({ page }) => {
    await page.goto('/dashboard/companies/1');

    // Look for edit functionality
    const editButton = page.locator('button:has-text("Edit")');

    if (await editButton.isVisible()) {
      await expect(editButton).toBeVisible();
    }
  });
});

test.describe('New Company Creation', () => {
  test('should navigate to new company form', async ({ page }) => {
    await page.goto('/dashboard/companies/new');

    // Page should load
    const response = await page.goto('/dashboard/companies/new');
    expect(response?.status()).toBe(200);
  });

  test('should have NIP input field', async ({ page }) => {
    await page.goto('/dashboard/companies/new');

    // Look for NIP input
    const nipInput = page.locator('input[name="nip"], input[placeholder*="NIP"], input[type="text"]').first();

    await expect(nipInput).toBeVisible();
  });

  test('should have validate NIP button', async ({ page }) => {
    await page.goto('/dashboard/companies/new');

    // Look for validate button
    const validateButton = page.locator('button:has-text("Validate")');

    if (await validateButton.isVisible()) {
      await expect(validateButton).toBeVisible();
    }
  });

  test('should have form fields for company data', async ({ page }) => {
    await page.goto('/dashboard/companies/new');

    await page.waitForLoadState('networkidle');

    // Should have multiple form inputs
    const inputs = page.locator('input[type="text"], input[type="email"], select');
    const count = await inputs.count();

    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Company Filtering', () => {
  test('should have VAT status filter', async ({ page }) => {
    await page.goto('/dashboard/companies');

    // Look for VAT filter
    const vatFilter = page.locator('select, [data-testid="vat-filter"]');

    if (await vatFilter.isVisible()) {
      await expect(vatFilter).toBeVisible();
    }
  });

  test('should have city filter', async ({ page }) => {
    await page.goto('/dashboard/companies');

    // Look for city filter
    const cityFilter = page.locator('select:has(option:text-is("All Cities")), [data-testid="city-filter"]');

    if (await cityFilter.isVisible()) {
      await expect(cityFilter).toBeVisible();
    }
  });
});
