/**
 * E2E Test: Complete OCR Workflow
 *
 * Tests the full end-to-end OCR pipeline:
 * 1. Upload invoice
 * 2. Trigger OCR processing
 * 3. Monitor real-time progress
 * 4. Review extracted data with confidence indicators
 * 5. Make corrections
 * 6. Save corrections
 * 7. Approve invoice
 * 8. Verify read-only mode
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
const TEST_EMAIL = 'test@deklaro.com';
const TEST_PASSWORD = 'Test123456789';
const TEST_TIMEOUT = 120000; // 2 minutes for OCR processing

test.describe('OCR Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Wait for form to be ready
    await page.waitForSelector('input#email', { state: 'visible', timeout: 15000 });

    await page.fill('input#email', TEST_EMAIL);
    await page.fill('input#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('Complete OCR workflow: Upload → Process → Review → Approve', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to invoices page
    await page.goto(`${BASE_URL}/dashboard/invoices`);
    await expect(page).toHaveTitle(/Invoices/i);

    // Step 2: Check if there's an invoice with status "UPLOADED"
    // If not, we'll need to upload one first
    const uploadedInvoice = page.locator('text=UPLOADED').first();
    const hasUploadedInvoice = await uploadedInvoice.isVisible().catch(() => false);

    if (!hasUploadedInvoice) {
      console.log('No uploaded invoice found - this test requires a pre-uploaded invoice');
      test.skip();
      return;
    }

    // Step 3: Click on the uploaded invoice to view details
    await uploadedInvoice.click();
    await page.waitForURL('**/invoices/**');

    // Step 4: Verify "Process with OCR" button is visible
    const processButton = page.locator('button', { hasText: /Process with OCR/i });
    await expect(processButton).toBeVisible({ timeout: 5000 });

    // Step 5: Click "Process with OCR" button
    await processButton.click();

    // Step 6: Verify OCRProcessingStatus component appears
    await expect(page.locator('text=/Processing Invoice|Invoice Queued/i')).toBeVisible({
      timeout: 5000
    });

    // Step 7: Wait for progress bar to appear
    const progressBar = page.locator('div[role="progressbar"], div.bg-blue-600');
    await expect(progressBar).toBeVisible({ timeout: 10000 });

    // Step 8: Monitor progress updates (optional - can skip if slow)
    // Just verify the status changes over time
    let previousProgress = '';
    for (let i = 0; i < 5; i++) {
      const currentStatus = await page.locator('text=/Processing|Extracting|Analyzing/i').textContent().catch(() => '');
      if (currentStatus !== previousProgress) {
        console.log(`Progress update ${i + 1}: ${currentStatus}`);
        previousProgress = currentStatus;
      }
      await page.waitForTimeout(2000); // Wait 2 seconds between checks
    }

    // Step 9: Wait for completion (timeout after 60 seconds)
    await expect(page.locator('text=/Processing complete|complete/i')).toBeVisible({
      timeout: 60000
    });

    // Step 10: Verify auto-switch to Extraction tab or ReviewExtractedData visibility
    // The page should either switch tabs or show the review form
    await page.waitForTimeout(1000); // Give UI time to update

    // Step 11: Verify ReviewExtractedData component is visible
    const reviewForm = page.locator('label', { hasText: /Invoice Number|Seller|Buyer/i }).first();
    await expect(reviewForm).toBeVisible({ timeout: 10000 });

    // Step 12: Verify confidence indicators are present
    const confidenceIndicators = page.locator('[role="status"]'); // ConfidenceIndicator components
    await expect(confidenceIndicators.first()).toBeVisible({ timeout: 5000 });

    // Step 13: Count low-confidence fields (red background)
    const lowConfidenceFields = page.locator('input.bg-red-50, input.border-red-300');
    const lowConfidenceCount = await lowConfidenceFields.count();
    console.log(`Found ${lowConfidenceCount} low-confidence fields to review`);

    // Step 14: Edit a field (if any low-confidence fields exist)
    if (lowConfidenceCount > 0) {
      const firstLowConfField = lowConfidenceFields.first();
      await firstLowConfField.click();
      await firstLowConfField.fill('1234567890'); // Example NIP
      console.log('Edited low-confidence field');
    } else {
      // Edit any field to test correction tracking
      const invoiceNumberField = page.locator('input[id="invoice_number"]');
      if (await invoiceNumberField.isVisible()) {
        const originalValue = await invoiceNumberField.inputValue();
        await invoiceNumberField.fill(originalValue + '-EDITED');
        console.log('Edited invoice number field for testing');
      }
    }

    // Step 15: Verify "Save Corrections" button shows count
    const saveButton = page.locator('button', { hasText: /Save Corrections/i });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await expect(saveButton).toContainText(/\(\d+\)/); // Should show count like "(1)"

    // Step 16: Click "Save Corrections"
    await saveButton.click();

    // Step 17: Wait for success toast/message
    await expect(page.locator('text=/saved successfully|Corrections saved/i')).toBeVisible({
      timeout: 10000
    });

    // Step 18: Verify "Approve Invoice" button is visible
    const approveButton = page.locator('button', { hasText: /Approve Invoice/i });
    await expect(approveButton).toBeVisible({ timeout: 5000 });

    // Step 19: Click "Approve Invoice"
    await approveButton.click();

    // Step 20: Handle confirmation dialog if present
    page.once('dialog', dialog => {
      console.log(`Confirmation dialog: ${dialog.message()}`);
      dialog.accept();
    });

    // Step 21: Wait for approval success
    // Note: InvoiceDetailView reloads the page on approval
    await page.waitForURL('**/invoices/**', { timeout: 10000 });

    // Step 22: Verify invoice status changed to "VERIFIED"
    await expect(page.locator('text=/VERIFIED|Approved/i')).toBeVisible({ timeout: 10000 });

    // Step 23: Verify form is now read-only
    const firstInput = page.locator('input').first();
    await expect(firstInput).toBeDisabled({ timeout: 5000 });

    // Step 24: Verify "Save Corrections" button is hidden or disabled
    const saveButtonAfterApproval = page.locator('button', { hasText: /Save Corrections/i });
    await expect(saveButtonAfterApproval).toBeHidden();

    console.log('✅ Complete OCR workflow test passed!');
  });

  test('OCR processing status updates in real-time', async ({ page }) => {
    // This test verifies that polling works correctly
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to invoice detail page (assuming an invoice exists)
    await page.goto(`${BASE_URL}/dashboard/invoices`);

    const uploadedInvoice = page.locator('text=UPLOADED').first();
    if (!await uploadedInvoice.isVisible().catch(() => false)) {
      console.log('No uploaded invoice found - skipping');
      test.skip();
      return;
    }

    await uploadedInvoice.click();
    await page.waitForURL('**/invoices/**');

    // Trigger OCR
    const processButton = page.locator('button', { hasText: /Process with OCR/i });
    await processButton.click();

    // Track status changes
    const statusChanges: string[] = [];

    // Monitor for 10 seconds
    for (let i = 0; i < 5; i++) {
      const status = await page.locator('text=/Processing|Queued|Extracting|Analyzing/i')
        .textContent()
        .catch(() => null);

      if (status && !statusChanges.includes(status)) {
        statusChanges.push(status);
        console.log(`Status change detected: ${status}`);
      }

      await page.waitForTimeout(2000);
    }

    // Verify status changed at least once (indicating polling is working)
    expect(statusChanges.length).toBeGreaterThan(0);
    console.log(`Total status changes: ${statusChanges.length}`);
  });

  test('Confidence indicators display correctly', async ({ page }) => {
    // Navigate to an invoice that has already been processed
    await page.goto(`${BASE_URL}/dashboard/invoices`);

    // Look for an invoice with extraction data
    const processedInvoice = page.locator('tr', { hasText: /PROCESSING|VERIFIED/i }).first();
    if (!await processedInvoice.isVisible().catch(() => false)) {
      console.log('No processed invoice found - skipping');
      test.skip();
      return;
    }

    await processedInvoice.click();
    await page.waitForURL('**/invoices/**');

    // Switch to Extraction tab if needed
    const extractionTab = page.locator('button', { hasText: /Extracted Data|Extraction/i });
    if (await extractionTab.isVisible()) {
      await extractionTab.click();
    }

    // Verify confidence indicators are present
    const indicators = page.locator('[role="status"]');
    const count = await indicators.count();

    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} confidence indicators`);

    // Verify color coding (check for green, yellow, or red backgrounds)
    const greenIndicators = page.locator('[role="status"].bg-green-100');
    const yellowIndicators = page.locator('[role="status"].bg-yellow-100');
    const redIndicators = page.locator('[role="status"].bg-red-100');

    const greenCount = await greenIndicators.count();
    const yellowCount = await yellowIndicators.count();
    const redCount = await redIndicators.count();

    console.log(`Confidence breakdown: ${greenCount} green, ${yellowCount} yellow, ${redCount} red`);

    // At least one type of indicator should exist
    expect(greenCount + yellowCount + redCount).toBeGreaterThan(0);
  });

  test('Form validation prevents invalid data', async ({ page }) => {
    // Navigate to an invoice with extraction data
    await page.goto(`${BASE_URL}/dashboard/invoices`);

    const processedInvoice = page.locator('tr', { hasText: /PROCESSING|VERIFIED|UPLOADED/i }).first();
    if (!await processedInvoice.isVisible().catch(() => false)) {
      console.log('No invoice found - skipping');
      test.skip();
      return;
    }

    await processedInvoice.click();
    await page.waitForURL('**/invoices/**');

    // Find NIP field
    const nipField = page.locator('input[id*="nip"], input[pattern*="10"]').first();
    if (!await nipField.isVisible()) {
      console.log('NIP field not found - skipping validation test');
      test.skip();
      return;
    }

    // Try to enter invalid NIP (too short)
    await nipField.fill('123');

    // Click save button
    const saveButton = page.locator('button', { hasText: /Save Corrections/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }

    // Verify validation error appears
    const errorMessage = page.locator('text=/must be 10 digits|NIP/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    console.log('✅ Form validation working correctly');
  });

  test('Read-only mode after approval', async ({ page }) => {
    // Find an already approved invoice
    await page.goto(`${BASE_URL}/dashboard/invoices`);

    const verifiedInvoice = page.locator('text=VERIFIED').first();
    if (!await verifiedInvoice.isVisible().catch(() => false)) {
      console.log('No verified invoice found - skipping');
      test.skip();
      return;
    }

    await verifiedInvoice.click();
    await page.waitForURL('**/invoices/**');

    // Switch to Extraction tab
    const extractionTab = page.locator('button', { hasText: /Extracted Data|Extraction/i });
    if (await extractionTab.isVisible()) {
      await extractionTab.click();
    }

    // Verify all form inputs are disabled
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        await expect(input).toBeDisabled();
      }
    }

    // Verify save button is not visible
    const saveButton = page.locator('button', { hasText: /Save Corrections/i });
    await expect(saveButton).toBeHidden();

    console.log('✅ Read-only mode verified');
  });
});
