import { test, expect } from '@playwright/test';

const LANDING_HEADING = 'Deklaro keeps Polish SMEs compliant and accountants in control';

test.describe('Landing page smoke', () => {
  test('renders marketing hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: LANDING_HEADING })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Activate Deklaro' })).toBeVisible();
  });
});

