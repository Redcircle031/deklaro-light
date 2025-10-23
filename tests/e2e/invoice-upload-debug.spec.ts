import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Invoice Upload', () => {
  test('should upload invoice and capture any errors', async ({ page }) => {
    // Enable console logging to capture errors
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true });

    // Login with test credentials
    console.log('Logging in...');
    await page.fill('input[type="email"]', 'test@deklaro.com');
    await page.fill('input[type="password"]', 'Test123456789');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/02-dashboard.png', fullPage: true });

    console.log('Navigating to invoices page...');
    await page.goto('http://localhost:4000/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/03-invoices-page.png', fullPage: true });

    // Create a test PDF file
    const testFilePath = path.join(__dirname, 'test-invoice.pdf');
    const fs = require('fs');

    // Create a simple PDF if it doesn't exist
    if (!fs.existsSync(testFilePath)) {
      // Simple PDF content (minimal valid PDF)
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Invoice) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000304 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
398
%%EOF`;
      fs.writeFileSync(testFilePath, pdfContent);
    }

    console.log('Looking for file upload input...');

    // Try to find the file upload button/input
    const fileInput = await page.locator('input[type="file"]').first();
    const isVisible = await fileInput.isVisible().catch(() => false);

    console.log(`File input visible: ${isVisible}`);
    await page.screenshot({ path: 'test-results/04-before-upload.png', fullPage: true });

    if (!isVisible) {
      // Try to find and click upload button/area
      const uploadButtons = [
        'button:has-text("Upload")',
        '[data-testid="upload-button"]',
        '.upload-area',
        '[role="button"]:has-text("upload")',
      ];

      for (const selector of uploadButtons) {
        const button = page.locator(selector).first();
        const exists = await button.count();
        if (exists > 0) {
          console.log(`Found upload trigger: ${selector}`);
          await button.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }

    // Upload the file
    console.log('Attempting to upload file...');
    try {
      await fileInput.setInputFiles(testFilePath);
      console.log('File selected successfully');

      // Wait for any upload to complete
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-results/05-after-upload.png', fullPage: true });

      // Check for any error messages on the page
      const errorElements = await page.locator('[role="alert"], .error, .alert-error, [class*="error"]').all();
      console.log(`Found ${errorElements.length} potential error elements`);

      for (let i = 0; i < errorElements.length; i++) {
        const text = await errorElements[i].textContent();
        if (text) {
          console.log(`Error element ${i + 1}: ${text}`);
          errors.push(`UI Error: ${text}`);
        }
      }

      // Check network requests for failed API calls
      const failedRequests: string[] = [];
      page.on('response', async (response) => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} ${response.url()}`);
          try {
            const body = await response.text();
            console.log(`Failed request body: ${body}`);
          } catch (e) {
            // Ignore if body can't be read
          }
        }
      });

    } catch (error) {
      console.error('Error during upload:', error);
      errors.push(`Upload error: ${error}`);
    }

    // Print all collected information
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));

    console.log('\n=== ERRORS FOUND ===');
    if (errors.length === 0) {
      console.log('No errors found!');
    } else {
      errors.forEach(err => console.log(err));
    }

    console.log('\n=== PAGE CONTENT ===');
    const pageText = await page.textContent('body');
    console.log(pageText?.substring(0, 500));

    // Final screenshot
    await page.screenshot({ path: 'test-results/06-final-state.png', fullPage: true });

    // Assertions
    if (errors.length > 0) {
      console.log('\n❌ Test found errors during invoice upload');
    } else {
      console.log('\n✅ No errors detected');
    }
  });
});
