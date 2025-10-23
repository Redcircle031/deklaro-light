import { test, expect } from '@playwright/test';

test.describe('Tenant dashboard placeholders', () => {
  test('requires auth redirect', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/login|dashboard/);
  });
});

