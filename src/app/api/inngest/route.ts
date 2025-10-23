/**
 * Inngest API Endpoint
 *
 * Serves Inngest functions via webhook.
 * This endpoint is called by Inngest Dev Server (local) or Inngest Cloud (production).
 *
 * @see https://www.inngest.com/docs/learn/serving-inngest-functions
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/queue/inngest-client';
import { processInvoiceOCR } from '@/lib/queue/ocr-worker';
import { notifyOCRCompleted } from '@/lib/queue/email-worker';
import { sendMonthlyDigests } from '@/lib/queue/digest-worker';

// Register all Inngest functions
const handler = serve({
  client: inngest,
  functions: [
    processInvoiceOCR, // Main OCR processing function
    notifyOCRCompleted, // Email notification on OCR completion
    sendMonthlyDigests, // Monthly digest cron job
  ],
});

export { handler as GET, handler as POST, handler as PUT };
