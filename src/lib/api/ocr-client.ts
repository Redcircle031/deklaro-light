/**
 * OCR API Client
 *
 * Wrapper functions for OCR-related API endpoints.
 * Handles tenant ID injection and consistent error handling.
 */

import type {
  OCRJobStatus,
  ExtractedData,
  ConfidenceScores,
} from '@/types/ocr';

/**
 * Response from GET /api/ocr/status/[id]
 */
export interface OCRStatusResponse {
  job_id: string;
  invoice_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;

  // QUEUED-specific
  queue_position?: number;

  // PROCESSING-specific
  started_at?: string;
  current_step?: 'UPLOAD' | 'PREPROCESS' | 'OCR' | 'AI_EXTRACT' | 'VALIDATE' | 'SAVE';
  progress?: number;
  estimated_completion?: string;

  // COMPLETED-specific
  completed_at?: string;
  duration_ms?: number;
  result?: {
    extracted_data: ExtractedData;
    confidence_scores: ConfidenceScores;
    ocr_confidence_overall: number;
    requires_review: boolean;
    raw_ocr_text: string;
  };

  // FAILED-specific
  error?: {
    message: string;
    step: string;
    details: Record<string, unknown>;
  };
  retry_count?: number;
  will_retry?: boolean;
}

/**
 * Request body for POST /api/ocr/process
 */
export interface ProcessOCRRequest {
  invoice_id: string;
}

/**
 * Response from POST /api/ocr/process
 */
export interface ProcessOCRResponse {
  job_id: string;
  invoice_id: string;
  status: 'QUEUED' | 'PROCESSING';
  created_at: string;
  queue_position?: number;
}

/**
 * Correction for review request
 */
export interface Correction {
  field_name: string;
  original_value: string | number;
  corrected_value: string | number;
}

/**
 * Request body for POST /api/invoices/[id]/review
 */
export interface ReviewRequest {
  corrections: Correction[];
  notes?: string;
}

/**
 * Response from POST /api/invoices/[id]/review
 */
export interface ReviewResponse {
  invoice_id: string;
  corrections_applied: number;
  reviewed_at: string;
  updated_data: ExtractedData;
}

/**
 * Response from POST /api/invoices/[id]/approve
 */
export interface ApproveResponse {
  invoice_id: string;
  approved_at: string;
  approved_by: string;
  status: 'VERIFIED';
}

/**
 * API Error class
 */
export class OCRAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OCRAPIError';
  }
}

/**
 * Get tenant ID from request headers
 */
function getTenantId(): string {
  // In Next.js middleware, tenant ID is set in headers
  // For client-side calls, we need to retrieve it from somewhere
  // This is a placeholder - adjust based on your auth implementation
  if (typeof window !== 'undefined') {
    // Try to get from localStorage or context
    const tenantId = localStorage.getItem('x-tenant-id');
    if (!tenantId) {
      throw new Error('Tenant ID not found. User may not be authenticated.');
    }
    return tenantId;
  }
  throw new Error('getTenantId() can only be called client-side');
}

/**
 * Trigger OCR processing for an invoice
 *
 * @param invoiceId - UUID of the invoice to process
 * @returns OCR job details with job_id for status polling
 */
export async function processInvoiceOCR(
  invoiceId: string
): Promise<ProcessOCRResponse> {
  const tenantId = getTenantId();

  const response = await fetch('/api/ocr/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ invoice_id: invoiceId } satisfies ProcessOCRRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OCRAPIError(
      errorData.error || 'Failed to start OCR processing',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * Fetch OCR job status
 *
 * @param jobId - UUID of the OCR job
 * @returns Current job status with step/progress/result
 */
export async function fetchOCRStatus(
  jobId: string
): Promise<OCRStatusResponse> {
  const tenantId = getTenantId();

  const response = await fetch(`/api/ocr/status/${jobId}`, {
    method: 'GET',
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OCRAPIError(
      errorData.error || 'Failed to fetch OCR status',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * Submit corrections for reviewed invoice
 *
 * @param invoiceId - UUID of the invoice
 * @param corrections - Array of field corrections
 * @param notes - Optional review notes
 * @returns Updated invoice data
 */
export async function submitCorrections(
  invoiceId: string,
  corrections: Correction[],
  notes?: string
): Promise<ReviewResponse> {
  const tenantId = getTenantId();

  const response = await fetch(`/api/invoices/${invoiceId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ corrections, notes } satisfies ReviewRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OCRAPIError(
      errorData.error || 'Failed to save corrections',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * Approve invoice after review
 *
 * @param invoiceId - UUID of the invoice to approve
 * @returns Approval confirmation with timestamp
 */
export async function approveInvoice(
  invoiceId: string
): Promise<ApproveResponse> {
  const tenantId = getTenantId();

  const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OCRAPIError(
      errorData.error || 'Failed to approve invoice',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * Retry failed OCR job
 *
 * @param jobId - UUID of the failed job
 * @returns New job details
 */
export async function retryOCRJob(jobId: string): Promise<ProcessOCRResponse> {
  const tenantId = getTenantId();

  const response = await fetch(`/api/ocr/retry/${jobId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new OCRAPIError(
      errorData.error || 'Failed to retry OCR job',
      response.status,
      errorData
    );
  }

  return response.json();
}
