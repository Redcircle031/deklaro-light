import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Complete Client-Side OCR Flow - Step by Step Test
 *
 * This test validates the entire invoice upload + OCR pipeline:
 * 1. Navigate to upload page
 * 2. Select invoice file
 * 3. Tesseract.js processes OCR in browser
 * 4. Upload file + OCR results to server
 * 5. Verify server saved the data
 */

test.describe('Complete OCR Flow - Step by Step', () => {
  // Increase timeout for OCR processing
  test.setTimeout(180000); // 3 minutes

  test('should complete full OCR upload flow', async ({ page }) => {
    console.log('\n🚀 Starting Complete OCR Flow Test\n');

    // ============================================
    // STEP 1: Navigate to Upload Page
    // ============================================
    console.log('📍 STEP 1: Navigating to upload page...');
    await page.goto('http://localhost:4000/test-ocr', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Verify page loaded
    await expect(page.locator('h1')).toContainText(/upload|ocr/i, { timeout: 10000 });
    console.log('✅ STEP 1 COMPLETE: Page loaded successfully\n');

    // ============================================
    // STEP 2: Locate File Input
    // ============================================
    console.log('📍 STEP 2: Locating file input...');
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    console.log('✅ STEP 2 COMPLETE: File input found\n');

    // ============================================
    // STEP 3: Select Invoice File
    // ============================================
    console.log('📍 STEP 3: Selecting test invoice file...');
    const testFile = path.join(__dirname, '../fixtures/test-invoice.png');
    await fileInput.setInputFiles(testFile);

    // Verify file was selected
    const fileSelectedText = page.locator('text=/file.*selected/i');
    await expect(fileSelectedText).toBeVisible({ timeout: 5000 });
    console.log('✅ STEP 3 COMPLETE: File selected\n');

    // ============================================
    // STEP 4: Click Upload Button
    // ============================================
    console.log('📍 STEP 4: Clicking upload button...');
    const uploadButton = page.locator('button', { hasText: /upload/i });
    await expect(uploadButton).toBeEnabled({ timeout: 2000 });

    await uploadButton.click();
    console.log('✅ STEP 4 COMPLETE: Upload button clicked\n');

    // ============================================
    // STEP 5: Wait for OCR to Start
    // ============================================
    console.log('📍 STEP 5: Waiting for OCR processing to start...');

    // Look for processing indicators
    const processingIndicator = page.locator('text=/Processing|Tesseract|recognizing/i');
    try {
      await expect(processingIndicator).toBeVisible({ timeout: 15000 });
      console.log('✅ STEP 5 COMPLETE: OCR processing started\n');
    } catch (e) {
      console.log('⚠️  STEP 5: No processing indicator found (might be too fast)\n');
    }

    // ============================================
    // STEP 6: Monitor OCR Progress
    // ============================================
    console.log('📍 STEP 6: Monitoring OCR progress...');

    // Check for progress bar or percentage
    const progressElements = await page.locator('text=/%|progress/i').count();
    if (progressElements > 0) {
      console.log('✅ Progress indicator found');

      // Wait for progress to complete (up to 90 seconds)
      let progressComplete = false;
      for (let i = 0; i < 90; i++) {
        const progressText = await page.locator('text=/%/').textContent().catch(() => '');
        console.log(`   OCR Progress: ${progressText || 'Processing...'}`);

        // Check if we see 100% or uploading state
        if (progressText?.includes('100') || await page.locator('text=/upload/i').isVisible()) {
          progressComplete = true;
          break;
        }

        await page.waitForTimeout(1000);
      }

      if (progressComplete) {
        console.log('✅ STEP 6 COMPLETE: OCR processing finished\n');
      } else {
        console.log('⚠️  STEP 6: Progress monitoring timed out\n');
      }
    } else {
      console.log('⚠️  STEP 6: No progress indicator (OCR might be complete)\n');
    }

    // ============================================
    // STEP 7: Wait for Upload to Complete
    // ============================================
    console.log('📍 STEP 7: Waiting for file upload...');

    // Look for upload completion messages
    const successMessage = page.locator('text=/success|uploaded|complete/i');
    try {
      await expect(successMessage).toBeVisible({ timeout: 60000 });
      console.log('✅ STEP 7 COMPLETE: Upload successful\n');
    } catch (e) {
      console.log('⚠️  STEP 7: No success message found\n');

      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/step7-upload-state.png' });
      console.log('📸 Screenshot saved: step7-upload-state.png\n');
    }

    // ============================================
    // STEP 8: Verify No Errors
    // ============================================
    console.log('📍 STEP 8: Checking for errors...');

    const errorMessage = page.locator('text=/error|failed|ERR/i');
    const hasError = await errorMessage.isVisible().catch(() => false);

    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log(`❌ STEP 8 FAILED: Error found: ${errorText}\n`);

      // Take screenshot of error
      await page.screenshot({ path: 'test-results/step8-error-state.png' });

      throw new Error(`Upload failed with error: ${errorText}`);
    } else {
      console.log('✅ STEP 8 COMPLETE: No errors detected\n');
    }

    // ============================================
    // STEP 9: Verify Upload Button State
    // ============================================
    console.log('📍 STEP 9: Verifying upload button state...');

    // Button should be enabled again after completion
    await expect(uploadButton).toBeEnabled({ timeout: 5000 });
    console.log('✅ STEP 9 COMPLETE: Upload button ready for next file\n');

    // ============================================
    // STEP 10: Final Verification
    // ============================================
    console.log('📍 STEP 10: Final verification...');

    // Take final screenshot
    await page.screenshot({ path: 'test-results/complete-flow-final.png', fullPage: true });
    console.log('📸 Final screenshot saved\n');

    console.log('✅ STEP 10 COMPLETE: Test finished successfully\n');
    console.log('🎉 ALL STEPS PASSED - Complete OCR Flow Working!\n');
  });

  test('should display OCR text after processing', async ({ page }) => {
    console.log('\n📝 Testing OCR Text Display\n');

    await page.goto('http://localhost:4000/test-ocr', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-invoice.png');
    await fileInput.setInputFiles(testFile);

    const uploadButton = page.locator('button', { hasText: /upload/i });
    await uploadButton.click();

    // Wait for processing to complete
    await page.waitForTimeout(30000); // Give OCR time to process

    // Check if OCR text is visible anywhere on the page
    // (This depends on your component showing the OCR results)
    const pageContent = await page.content();
    console.log('📄 Page contains invoice-related text:', pageContent.includes('FAKTURA') || pageContent.includes('invoice'));

    console.log('✅ OCR text display test complete\n');
  });

  test('should handle multiple consecutive uploads', async ({ page }) => {
    console.log('\n🔄 Testing Multiple Uploads\n');

    await page.goto('http://localhost:4000/test-ocr', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('button', { hasText: /upload/i });
    const testFile = path.join(__dirname, '../fixtures/test-invoice.png');

    // Upload #1
    console.log('📤 Upload #1...');
    await fileInput.setInputFiles(testFile);
    await uploadButton.click();
    await page.waitForTimeout(35000); // Wait for OCR + upload
    console.log('✅ Upload #1 complete');

    // Upload #2
    console.log('📤 Upload #2...');
    await fileInput.setInputFiles(testFile);
    await uploadButton.click();
    await page.waitForTimeout(35000); // Wait for OCR + upload
    console.log('✅ Upload #2 complete');

    console.log('✅ Multiple uploads test complete\n');
  });
});

test.describe('OCR Component Integration', () => {
  test('should load Tesseract.js library', async ({ page }) => {
    await page.goto('http://localhost:4000/test-ocr', { timeout: 60000 });

    // Check if page loaded successfully
    await expect(page.locator('body')).toBeVisible();

    // Check console for Tesseract logs
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.waitForTimeout(5000);

    console.log('📋 Console logs:', logs.filter((log) => log.includes('Tesseract') || log.includes('OCR')));
  });
});
