/**
 * Inngest OCR Worker Function
 *
 * Processes invoices through the complete OCR pipeline:
 * QUEUED → PROCESSING (OCR → AI_EXTRACT → VALIDATE) → COMPLETED
 *
 * Each step creates a processing_log entry for tracking.
 */

import { inngest } from './inngest-client';
import { createClient } from '@supabase/supabase-js';
import { recogniseInvoiceWithVision } from '@/lib/ocr/vision';
import { extractInvoiceData, validateExtractedData, calculateOverallConfidence } from '@/lib/ai/extraction-service';
import type { ExtractedData, ConfidenceScores } from '@/lib/ai/schemas/invoice-schema';
import { NonRetriableError } from 'inngest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialize admin Supabase client for background jobs (no user session)
// This prevents build-time errors when env vars aren't available
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
}

type ProcessingStep = 'OCR' | 'AI_EXTRACT' | 'VALIDATE' | 'SAVE';

/**
 * Main OCR processing function
 * Triggered by 'invoice/uploaded' event
 */
export const processInvoiceOCR = inngest.createFunction(
  {
    id: 'process-invoice-ocr',
    name: 'Process Invoice with OCR and AI',
    retries: 3,
  },
  { event: 'invoice/uploaded' },
  async ({ event, step }) => {
    const { invoice_id, tenant_id, file_path } = event.data;

    console.log(`[OCR Worker] Starting processing for invoice ${invoice_id}`);

    // Step 1: Fetch invoice and create OCR job
    const { job_id, file_url, has_client_ocr, client_ocr_text, client_ocr_confidence } = await step.run('initialize-job', async () => {
      const supabase = getSupabaseAdmin();

      // Fetch invoice (include OCR fields to check if client-side OCR was done)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, original_file_url, status, ocr_result, ocr_confidence')
        .eq('id', invoice_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (invoiceError || !invoice) {
        throw new NonRetriableError(`Invoice not found: ${invoice_id}`);
      }

      // Accept both UPLOADED and UPLOADED_WITH_OCR statuses
      if (!['UPLOADED', 'UPLOADED_WITH_OCR'].includes(invoice.status)) {
        throw new NonRetriableError(`Invoice status must be UPLOADED or UPLOADED_WITH_OCR, got ${invoice.status}`);
      }

      // Check for existing OCR job
      const { data: existingJob } = await supabase
        .from('ocr_jobs')
        .select('id, status')
        .eq('invoice_id', invoice_id)
        .in('status', ['QUEUED', 'PROCESSING'])
        .single();

      if (existingJob) {
        throw new NonRetriableError(`OCR job already in progress: ${existingJob.id}`);
      }

      // Create OCR job
      const { data: newJob, error: jobError } = await supabase
        .from('ocr_jobs')
        .insert({
          invoice_id,
          tenant_id,
          status: 'PROCESSING',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (jobError || !newJob) {
        throw new Error(`Failed to create OCR job: ${jobError?.message}`);
      }

      // Get signed URL for file download
      const { data: urlData, error: urlError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.original_file_url, 3600); // 1 hour expiry

      if (urlError || !urlData) {
        throw new Error(`Failed to get file URL: ${urlError?.message}`);
      }

      await createProcessingLog(newJob.id, tenant_id, 'OCR', 'STARTED', null);

      return {
        job_id: newJob.id,
        file_url: urlData.signedUrl,
        has_client_ocr: !!invoice.ocr_result,
        client_ocr_text: invoice.ocr_result,
        client_ocr_confidence: invoice.ocr_confidence,
      };
    });

    // Step 2: Run OCR (skip if client-side OCR was already done)
    const { raw_ocr_text, ocr_confidence } = await step.run('run-ocr', async () => {
      // If client-side OCR was already performed, use those results
      if (has_client_ocr && client_ocr_text) {
        console.log(`[OCR Worker] Using client-side OCR results (confidence: ${client_ocr_confidence}%)`);

        await createProcessingLog(job_id, tenant_id, 'OCR', 'COMPLETED', {
          confidence: client_ocr_confidence,
          char_count: client_ocr_text.length,
          source: 'client-side',
        });

        return {
          raw_ocr_text: client_ocr_text,
          ocr_confidence: client_ocr_confidence || 0,
        };
      }

      // Otherwise, run server-side OCR
      try {
        console.log(`[OCR Worker] Running server-side OCR (Vision API)...`);

        // Download file
        const response = await fetch(file_url);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());

        // Run OCR with Google Cloud Vision (or mock)
        const ocrResult = await recogniseInvoiceWithVision(buffer);

        await createProcessingLog(job_id, tenant_id, 'OCR', 'COMPLETED', {
          confidence: ocrResult.confidence,
          char_count: ocrResult.text.length,
          source: 'server-side',
        });

        return {
          raw_ocr_text: ocrResult.text,
          ocr_confidence: ocrResult.confidence,
        };
      } catch (error) {
        await createProcessingLog(job_id, tenant_id, 'OCR', 'FAILED', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });

    // Step 3: Extract data with AI
    const { extracted_data, confidence_scores } = await step.run('ai-extract', async () => {
      try {
        console.log(`[OCR Worker] Running AI extraction...`);

        await createProcessingLog(job_id, tenant_id, 'AI_EXTRACT', 'STARTED', null);

        const aiResult = await extractInvoiceData(raw_ocr_text);

        await createProcessingLog(job_id, tenant_id, 'AI_EXTRACT', 'COMPLETED', {
          token_usage: aiResult.token_usage,
        });

        return {
          extracted_data: aiResult.extracted_data,
          confidence_scores: aiResult.confidence_scores,
        };
      } catch (error) {
        await createProcessingLog(job_id, tenant_id, 'AI_EXTRACT', 'FAILED', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });

    // Step 4: Validate data
    const { validation_errors } = await step.run('validate', async () => {
      try {
        console.log(`[OCR Worker] Validating extracted data...`);

        await createProcessingLog(job_id, tenant_id, 'VALIDATE', 'STARTED', null);

        const validation = validateExtractedData(extracted_data);

        await createProcessingLog(job_id, tenant_id, 'VALIDATE', 'COMPLETED', {
          valid: validation.valid,
          errors: validation.errors,
        });

        return { validation_errors: validation.errors };
      } catch (error) {
        await createProcessingLog(job_id, tenant_id, 'VALIDATE', 'FAILED', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });

    // Step 5: Save results to database
    await step.run('save-results', async () => {
      try {
        console.log(`[OCR Worker] Saving results...`);

        await createProcessingLog(job_id, tenant_id, 'SAVE', 'STARTED', null);

        const supabase = getSupabaseAdmin();
        const overall_confidence = calculateOverallConfidence(confidence_scores);

        // Update invoice with extracted data
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            invoice_number: extracted_data.invoice_number,
            issue_date: extracted_data.issue_date,
            due_date: extracted_data.due_date,
            net_amount: extracted_data.net_amount,
            vat_amount: extracted_data.vat_amount,
            gross_amount: extracted_data.gross_amount,
            currency: extracted_data.currency,
            seller_nip: extracted_data.seller.nip,
            buyer_nip: extracted_data.buyer.nip,
            extracted_data,
            confidence_scores,
            overall_confidence,
            raw_ocr_text,
            ocr_confidence,
            status: validation_errors.length > 0 ? 'NEEDS_REVIEW' : 'EXTRACTED',
            processed_at: new Date().toISOString(),
          })
          .eq('id', invoice_id);

        if (updateError) {
          throw new Error(`Failed to update invoice: ${updateError.message}`);
        }

        // Mark job as completed
        const { error: jobUpdateError } = await supabase
          .from('ocr_jobs')
          .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            result: {
              overall_confidence,
              validation_errors,
            },
          })
          .eq('id', job_id);

        if (jobUpdateError) {
          throw new Error(`Failed to update job: ${jobUpdateError.message}`);
        }

        await createProcessingLog(job_id, tenant_id, 'SAVE', 'COMPLETED', null);

        console.log(`[OCR Worker] Processing completed for invoice ${invoice_id}`);

        // Send completion event
        await inngest.send({
          name: 'ocr/job.completed',
          data: {
            job_id,
            invoice_id,
            tenant_id,
          },
        });
      } catch (error) {
        await createProcessingLog(job_id, tenant_id, 'SAVE', 'FAILED', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Mark job as failed
        const supabase = getSupabaseAdmin();
        await supabase
          .from('ocr_jobs')
          .update({
            status: 'FAILED',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', job_id);

        throw error;
      }
    });

    return { job_id, invoice_id, status: 'COMPLETED' };
  }
);

/**
 * Helper: Create processing log entry
 */
async function createProcessingLog(
  job_id: string,
  tenant_id: string,
  step: ProcessingStep,
  status: 'STARTED' | 'COMPLETED' | 'FAILED',
  metadata: Record<string, unknown> | null
) {
  const supabase = getSupabaseAdmin();

  await supabase.from('processing_logs').insert({
    job_id,
    tenant_id,
    step,
    status,
    metadata,
    created_at: new Date().toISOString(),
  });
}
