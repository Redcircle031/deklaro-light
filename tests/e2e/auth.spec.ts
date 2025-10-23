import { test, expect } from '@playwright/test';

test.describe('Authentication surfaces', () => {
  test('signin form renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('signup form renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create your Deklaro account' })).toBeVisible();
    await expect(page.getByLabel('Work email')).toBeVisible();
  });

  test('password reset renders', async ({ page }) => {
    await page.goto('/reset');
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  });
});

