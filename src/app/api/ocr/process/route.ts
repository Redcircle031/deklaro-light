/**
 * POST /api/ocr/process
 *
 * Triggers OCR processing for an uploaded invoice.
 * Creates an OCR job and sends event to Inngest queue.
 *
 * @see specs/002-ocr-pipeline/contracts/process-ocr.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/queue/inngest-client';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// Request schema
const ProcessOCRRequestSchema = z.object({
  invoice_id: z.string().uuid('Invalid invoice ID format'),
});

/**
 * POST /api/ocr/process
 * Start OCR processing for an invoice
 */
async function ocrProcessHandler(request: NextRequest) {
  try {
    // Get tenant ID from headers
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ProcessOCRRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { invoice_id } = validation.data;
    const supabase = await getServerSupabaseClient();

    // 1. Check invoice exists and belongs to tenant
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, file_path, status, tenantId')
      .eq('id', invoice_id)
      .eq('tenantId', tenantId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 404 }
      );
    }

    // 2. Check invoice status is UPLOADED
    if (invoice.status !== 'UPLOADED') {
      return NextResponse.json(
        {
          error: `Invoice must be in UPLOADED status, current status: ${invoice.status}`,
        },
        { status: 400 }
      );
    }

    // 3. Check for existing OCR job in progress
    const { data: existingJob } = await supabase
      .from('ocr_jobs')
      .select('id, status, created_at')
      .eq('invoice_id', invoice_id)
      .in('status', ['QUEUED', 'PROCESSING'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json(
        {
          error: 'OCR job already in progress for this invoice',
          job_id: existingJob.id,
          status: existingJob.status,
        },
        { status: 409 }
      );
    }

    // 4. Create OCR job record
    const { data: newJob, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        invoice_id,
        tenant_id: tenantId,
        status: 'QUEUED',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobError || !newJob) {
      console.error('[OCR Process] Failed to create job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create OCR job', details: jobError?.message },
        { status: 500 }
      );
    }

    // 5. Send event to Inngest queue
    try {
      await inngest.send({
        name: 'invoice/uploaded',
        data: {
          invoice_id,
          tenant_id: tenantId,
          file_path: invoice.file_path,
        },
      });
    } catch (inngestError) {
      console.error('[OCR Process] Failed to send Inngest event:', inngestError);

      // Mark job as failed
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'FAILED',
          error_message: 'Failed to queue job',
          completed_at: new Date().toISOString(),
        })
        .eq('id', newJob.id);

      return NextResponse.json(
        { error: 'Failed to queue OCR job' },
        { status: 500 }
      );
    }

    // 6. Return success response
    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + 2); // ~2 min estimate

    return NextResponse.json(
      {
        job_id: newJob.id,
        status: 'QUEUED',
        estimated_completion: estimatedCompletion.toISOString(),
        message: 'OCR processing started',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[OCR Process] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 30 OCR requests per 5 minutes per tenant
export const POST = withRateLimit(
  ocrProcessHandler,
  RATE_LIMITS.OCR,
  'ocr-process'
);

