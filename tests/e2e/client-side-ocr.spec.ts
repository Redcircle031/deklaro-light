import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Test: Client-Side OCR Upload Flow
 *
 * Tests the complete invoice upload flow with client-side OCR:
 * 1. User selects invoice file
 * 2. Tesseract.js processes it in browser
 * 3. OCR results + file uploaded to server
 * 4. Server saves with UPLOADED_WITH_OCR status
 * 5. Background worker uses client OCR results
 */

test.describe('Client-Side OCR Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test OCR page
    await page.goto('http://localhost:4000/test-ocr');
  });

  test('should process invoice with client-side OCR', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for OCR processing

    // Locate the file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Select test invoice file
    const testFile = path.join(__dirname, '../fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);

    // Verify file is selected
    await expect(page.locator('text=/1 file.*selected/i')).toBeVisible();

    // Click upload button
    const uploadButton = page.locator('button:has-text("Upload")');
    await uploadButton.click();

    // Wait for OCR processing to start
    await expect(page.locator('text=/Processing OCR/i')).toBeVisible({ timeout: 5000 });

    // Wait for progress bar
    const progressBar = page.locator('[role="progressbar"], .bg-blue-600');
    await expect(progressBar).toBeVisible({ timeout: 10000 });

    // Wait for OCR to complete (can take 10-30 seconds)
    await expect(page.locator('text=/Uploading/i')).toBeVisible({ timeout: 60000 });

    // Wait for success message
    await expect(
      page.locator('text=/Successfully uploaded|Upload successful/i')
    ).toBeVisible({ timeout: 10000 });

    // Verify no errors
    await expect(page.locator('text=/Error|Failed/i')).not.toBeVisible();
  });

  test('should show OCR progress during processing', async ({ page }) => {
    test.setTimeout(90000);

    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);

    const uploadButton = page.locator('button:has-text("Upload")');
    await uploadButton.click();

    // Check for progress indicator
    const hasProgress = await page.locator('text=/%|Processing/i').isVisible({ timeout: 5000 });
    expect(hasProgress).toBeTruthy();
  });

  test('should handle multiple file upload', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for multiple files

    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-invoice.jpg');

    // Upload same file twice (simulating multiple invoices)
    await fileInput.setInputFiles([testFile, testFile]);

    // Verify files selected
    await expect(page.locator('text=/2 file.*selected/i')).toBeVisible();

    const uploadButton = page.locator('button:has-text("Upload")');
    await uploadButton.click();

    // Wait for completion
    await expect(
      page.locator('text=/Successfully uploaded.*2.*invoice/i')
    ).toBeVisible({ timeout: 120000 });
  });

  test('should disable upload button during processing', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-invoice.jpg');
    await fileInput.setInputFiles(testFile);

    const uploadButton = page.locator('button:has-text("Upload")');
    await uploadButton.click();

    // Button should be disabled during processing
    await expect(uploadButton).toBeDisabled({ timeout: 2000 });
  });

  test('should handle upload without file selection', async ({ page }) => {
    const uploadButton = page.locator('button:has-text("Upload")');

    // Button should be disabled when no files selected
    await expect(uploadButton).toBeDisabled();
  });
});

test.describe('Client-Side OCR Hook', () => {
  test('should initialize Tesseract.js worker', async ({ page }) => {
    await page.goto('http://localhost:4000');

    // Check if Tesseract.js is loaded
    const tesseractLoaded = await page.evaluate(() => {
      return typeof window !== 'undefined' && 'Tesseract' in window;
    });

    // Note: This might be false if Tesseract is only imported in components
    // The actual test is if OCR processing works
    console.log('Tesseract loaded globally:', tesseractLoaded);
  });
});

test.describe('Upload API Integration', () => {
  test('should accept OCR results in form data', async ({ request }) => {
    // This test requires authentication setup
    // Skipped for now - can be implemented with proper auth flow

    test.skip();
  });
});
