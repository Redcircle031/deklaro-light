/**
 * E2E Test: Real Invoice Upload and Extraction
 *
 * Tests the complete invoice upload flow:
 * 1. Login
 * 2. Upload real invoice
 * 3. Wait for extraction
 * 4. Verify extracted data appears in list
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test credentials
const TEST_EMAIL = 'test@deklaro.com';
const TEST_PASSWORD = 'Test123456789';

// Use production URL
const BASE_URL = process.env.BASE_URL || 'https://deklaro-j07w0pte3-roberto-gonzalezs-projects-d1b15432.vercel.app';

test.describe('Invoice Upload and Extraction Flow', () => {
  test('should upload invoice and extract data with GPT-4o Vision', async ({ page }) => {
    // Step 1: Navigate to login page
    console.log('[Test] Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Step 2: Login
    console.log('[Test] Logging in...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('[Test] Login successful');

    // Step 3: Navigate to invoices page
    console.log('[Test] Navigating to invoices page...');
    await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'networkidle' });

    // Step 4: Get invoice count before upload
    const invoiceRowsBefore = await page.locator('table tbody tr').count();
    console.log(`[Test] Invoices before upload: ${invoiceRowsBefore}`);

    // Step 5: Create a test invoice image (simple Polish invoice)
    console.log('[Test] Creating test invoice...');
    const testInvoicePath = path.join(__dirname, '../fixtures/test-invoice.txt');
    const testInvoiceContent = `
FAKTURA VAT
Numer: FV/2024/TEST001
Data wystawienia: 2024-10-24
Termin płatności: 2024-11-24

Sprzedawca:
Test Company Sp. z o.o.
NIP: 1234567890
ul. Testowa 123
00-001 Warszawa

Nabywca:
Client Company Sp. z o.o.
NIP: 0987654321
ul. Kliencka 456
00-002 Kraków

Kwota netto: 1000.00 PLN
VAT 23%: 230.00 PLN
Kwota brutto: 1230.00 PLN
`;

    // Write test invoice to temp file
    fs.writeFileSync(testInvoicePath, testInvoiceContent);

    // Step 6: Upload invoice via drag-and-drop zone
    console.log('[Test] Uploading invoice...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testInvoicePath);

    // Step 7: Wait for upload to complete (watch for "Complete" notification)
    console.log('[Test] Waiting for upload to complete...');
    await page.waitForSelector('text=/complete|uploaded/i', { timeout: 15000 });

    // Step 8: Wait for extraction (GPT-4o Vision should complete in 5-15s)
    console.log('[Test] Waiting for extraction to complete...');
    await page.waitForTimeout(20000); // Give it 20 seconds max

    // Step 9: Refresh page to see updated data
    console.log('[Test] Refreshing page...');
    await page.reload({ waitUntil: 'networkidle' });

    // Step 10: Check if invoice appears in list with extracted data
    console.log('[Test] Checking for extracted invoice data...');
    const invoiceRowsAfter = await page.locator('table tbody tr').count();
    expect(invoiceRowsAfter).toBeGreaterThan(invoiceRowsBefore);

    // Step 11: Find the newest invoice row (first row)
    const firstRow = page.locator('table tbody tr').first();

    // Step 12: Verify extracted data
    const invoiceNumber = await firstRow.locator('td').nth(0).textContent();
    const company = await firstRow.locator('td').nth(1).textContent();
    const date = await firstRow.locator('td').nth(2).textContent();
    const amount = await firstRow.locator('td').nth(3).textContent();
    const status = await firstRow.locator('td').nth(4).textContent();
    const confidence = await firstRow.locator('td').nth(5).textContent();

    console.log('[Test] Extracted data:');
    console.log(`  Invoice #: ${invoiceNumber}`);
    console.log(`  Company: ${company}`);
    console.log(`  Date: ${date}`);
    console.log(`  Amount: ${amount}`);
    console.log(`  Status: ${status}`);
    console.log(`  Confidence: ${confidence}`);

    // Step 13: Assertions
    expect(invoiceNumber).not.toBe('—'); // Should have extracted invoice number
    expect(invoiceNumber).toContain('FV'); // Polish invoice format
    expect(company).not.toBe('—'); // Should have company name
    expect(company).toContain('Company'); // Should match test data
    expect(status).toBe('EXTRACTED'); // Should be extracted
    expect(confidence).not.toBe('—'); // Should have confidence score

    // Step 14: Verify NOT mock data
    expect(company).not.toContain('ACME'); // Should NOT be mock data
    expect(invoiceNumber).not.toContain('001'); // Should NOT be default mock

    console.log('[Test] ✅ Invoice extraction successful!');

    // Cleanup
    fs.unlinkSync(testInvoicePath);
  });
});
