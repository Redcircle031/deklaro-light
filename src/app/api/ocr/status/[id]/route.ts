/**
 * GET /api/ocr/status/[id]
 *
 * Check OCR job status and retrieve results.
 * Returns different response schemas based on job status (QUEUED, PROCESSING, COMPLETED, FAILED).
 *
 * @see specs/002-ocr-pipeline/contracts/job-status.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TENANT_HEADER = 'x-tenant-id';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    // Get tenant ID from header
    const tenantId = request.headers.get(TENANT_HEADER);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch OCR job with invoice data
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .select(`
        id,
        invoice_id,
        status,
        started_at,
        completed_at,
        error_message,
        retry_count,
        max_retries,
        created_at,
        invoices!invoice_id (
          id,
          ocr_raw_text,
          ocr_confidence_overall,
          extracted_data,
          confidence_scores,
          requires_review
        )
      `)
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or not accessible' },
        { status: 404 }
      );
    }

    // Get processing logs for current step
    const { data: logs } = await supabase
      .from('processing_logs')
      .select('step, status, created_at')
      .eq('ocr_job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1);

    const currentLog = logs?.[0];

    // Build response based on status
    const baseResponse = {
      job_id: job.id,
      invoice_id: job.invoice_id,
      status: job.status,
      created_at: job.created_at,
    };

    switch (job.status) {
      case 'QUEUED': {
        // Count pending jobs to estimate queue position
        const { count } = await supabase
          .from('ocr_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'QUEUED')
          .lt('created_at', job.created_at);

        return NextResponse.json({
          ...baseResponse,
          queue_position: (count || 0) + 1,
        });
      }

      case 'PROCESSING': {
        // Calculate progress based on current step
        const stepProgress: Record<string, number> = {
          UPLOAD: 10,
          PREPROCESS: 20,
          OCR: 50,
          AI_EXTRACT: 80,
          VALIDATE: 90,
          SAVE: 95,
        };

        const progress = currentLog?.step ? stepProgress[currentLog.step] || 0 : 0;

        // Estimate completion time (30 seconds from start)
        const estimatedCompletion = job.started_at
          ? new Date(new Date(job.started_at).getTime() + 30000).toISOString()
          : new Date(Date.now() + 30000).toISOString();

        return NextResponse.json({
          ...baseResponse,
          started_at: job.started_at,
          current_step: currentLog?.step || 'OCR',
          progress,
          estimated_completion: estimatedCompletion,
        });
      }

      case 'COMPLETED': {
        const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;

        // Calculate duration
        const duration = job.started_at && job.completed_at
          ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
          : 0;

        return NextResponse.json({
          ...baseResponse,
          started_at: job.started_at,
          completed_at: job.completed_at,
          duration_ms: duration,
          result: {
            extracted_data: invoice?.extracted_data || {},
            confidence_scores: invoice?.confidence_scores || {},
            ocr_confidence_overall: invoice?.ocr_confidence_overall || 0,
            requires_review: invoice?.requires_review || false,
            raw_ocr_text: invoice?.ocr_raw_text,
          },
        });
      }

      case 'FAILED': {
        // Determine if retry will happen
        const willRetry = job.retry_count < job.max_retries;

        // Determine which step failed
        const failedStep = currentLog?.step || 'OCR';

        return NextResponse.json({
          ...baseResponse,
          started_at: job.started_at,
          completed_at: job.completed_at,
          error: {
            message: job.error_message || 'Unknown error occurred',
            step: failedStep,
            details: {},
          },
          retry_count: job.retry_count,
          will_retry: willRetry,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown job status' },
          { status: 500 }
        );
    }
  } catch (error) {
    console.error('[OCR Status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
