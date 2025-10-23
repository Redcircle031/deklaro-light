/**
 * OCR Pipeline Type Definitions
 *
 * This file contains TypeScript interfaces for the OCR processing pipeline,
 * including job status tracking, extracted data, and confidence scoring.
 *
 * @see specs/002-ocr-pipeline/data-model.md
 * @see specs/002-ocr-pipeline/contracts/
 */

/**
 * OCR job status enum
 */
export type OCRJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Processing step enum
 */
export type ProcessingStep = 'UPLOAD' | 'PREPROCESS' | 'OCR' | 'AI_EXTRACT' | 'VALIDATE' | 'SAVE';

/**
 * Processing log status
 */
export type ProcessingLogStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

/**
 * Invoice type based on seller/buyer relationship
 */
export type InvoiceType = 'SALE' | 'PURCHASE' | 'CORRECTION';

/**
 * Supported currencies
 */
export type Currency = 'PLN' | 'EUR' | 'USD';

/**
 * Polish VAT rates
 */
export type VATRate = 23 | 8 | 5 | 0;

// ============================================================================
// Database Entities
// ============================================================================

/**
 * OCR Job entity - tracks async OCR processing
 */
export interface OCRJob {
  id: string;
  tenant_id: string;
  invoice_id: string;
  status: OCRJobStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

/**
 * Processing Log entity - audit trail of OCR steps
 */
export interface ProcessingLog {
  id: string;
  tenant_id: string;
  ocr_job_id: string;
  step: ProcessingStep;
  status: ProcessingLogStatus;
  details: ProcessingLogDetails | null;
  duration_ms: number | null;
  created_at: string;
}

/**
 * Processing log details (JSONB)
 */
export interface ProcessingLogDetails {
  step: ProcessingStep;
  input?: {
    file_size?: number;
    file_format?: string;
    image_dimensions?: {
      width: number;
      height: number;
    };
  };
  output?: {
    text_length?: number;
    confidence?: number;
    fields_extracted?: number;
    errors?: string[];
  };
  metadata?: {
    tesseract_version?: string;
    gpt_model?: string;
    preprocessing_applied?: string[];
  };
}

/**
 * Correction History entity - tracks manual edits for ML improvement
 */
export interface CorrectionHistory {
  id: string;
  tenant_id: string;
  invoice_id: string;
  field_name: string;
  original_value: string | null;
  corrected_value: string;
  original_confidence: number | null;
  corrected_by: string;
  created_at: string;
}

// ============================================================================
// Extracted Data Structures (JSONB)
// ============================================================================

/**
 * Company information extracted from invoice
 */
export interface CompanyInfo {
  name: string;
  nip: string;
  address: string | null;
}

/**
 * Invoice line item
 */
export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: VATRate;
  net: number;
  vat: number;
  gross: number;
}

/**
 * Complete extracted invoice data (JSONB stored in invoices.extracted_data)
 */
export interface ExtractedData {
  invoice_number: string;
  issue_date: string; // ISO 8601 date
  due_date: string | null; // ISO 8601 date
  seller: CompanyInfo;
  buyer: CompanyInfo;
  currency: Currency;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  line_items: LineItem[];
  invoice_type: InvoiceType;
}

/**
 * Confidence scores for each extracted field (JSONB stored in invoices.confidence_scores)
 */
export interface ConfidenceScores {
  invoice_number: number; // 0-100
  issue_date: number; // 0-100
  due_date: number; // 0-100
  seller_name: number; // 0-100
  seller_nip: number; // 0-100
  buyer_name: number; // 0-100
  buyer_nip: number; // 0-100
  net_amount: number; // 0-100
  vat_amount: number; // 0-100
  gross_amount: number; // 0-100
  line_items: number; // 0-100 (average)
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * POST /api/ocr/process request body
 */
export interface ProcessOCRRequest {
  invoice_id: string;
  options?: {
    skip_preprocessing?: boolean;
    force_reprocess?: boolean;
    language?: 'pol' | 'eng';
  };
}

/**
 * POST /api/ocr/process response
 */
export interface ProcessOCRResponse {
  job_id: string;
  invoice_id: string;
  status: 'QUEUED' | 'PROCESSING';
  created_at: string;
  estimated_completion: string;
}

/**
 * GET /api/ocr/status/{job_id} response - Base interface
 */
export interface OCRStatusResponse {
  job_id: string;
  invoice_id: string;
  status: OCRJobStatus;
  created_at: string;
}

/**
 * OCR job status when QUEUED
 */
export interface OCRStatusQueued extends OCRStatusResponse {
  status: 'QUEUED';
  queue_position: number;
}

/**
 * OCR job status when PROCESSING
 */
export interface OCRStatusProcessing extends OCRStatusResponse {
  status: 'PROCESSING';
  started_at: string;
  current_step: ProcessingStep;
  progress: number; // 0-100
  estimated_completion: string;
}

/**
 * OCR result included in COMPLETED status
 */
export interface OCRResult {
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
  ocr_confidence_overall: number; // 0-100
  requires_review: boolean;
  raw_ocr_text?: string;
}

/**
 * OCR job status when COMPLETED
 */
export interface OCRStatusCompleted extends OCRStatusResponse {
  status: 'COMPLETED';
  started_at: string;
  completed_at: string;
  duration_ms: number;
  result: OCRResult;
}

/**
 * Error details for FAILED status
 */
export interface OCRError {
  message: string;
  step: ProcessingStep;
  details?: Record<string, unknown>;
}

/**
 * OCR job status when FAILED
 */
export interface OCRStatusFailed extends OCRStatusResponse {
  status: 'FAILED';
  started_at: string;
  completed_at: string;
  error: OCRError;
  retry_count: number;
  will_retry: boolean;
}

/**
 * Union type for all possible OCR status responses
 */
export type OCRStatus =
  | OCRStatusQueued
  | OCRStatusProcessing
  | OCRStatusCompleted
  | OCRStatusFailed;

// ============================================================================
// Review & Correction Types
// ============================================================================

/**
 * Field correction for manual review
 */
export interface Correction {
  field_name: string;
  corrected_value: string | number;
  original_value?: string | number | null;
}

/**
 * POST /api/invoices/{id}/review request body
 */
export interface ReviewInvoiceRequest {
  corrections: Correction[];
  notes?: string;
}

/**
 * POST /api/invoices/{id}/review response
 */
export interface ReviewInvoiceResponse {
  invoice_id: string;
  corrections_applied: number;
  reviewed_at: string;
  reviewed_by: string;
  updated_data: ExtractedData;
}

/**
 * POST /api/invoices/{id}/approve response
 */
export interface ApproveInvoiceResponse {
  invoice_id: string;
  approved_at: string;
  approved_by: string;
  status: 'VERIFIED';
}

// ============================================================================
// Internal Service Types
// ============================================================================

/**
 * Tesseract.js OCR result
 */
export interface TesseractResult {
  text: string;
  confidence: number;
}

/**
 * Image preprocessing result
 */
export interface PreprocessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  rotation_applied: number; // degrees
  preprocessing_steps: string[];
}

/**
 * OpenAI GPT-4 extraction result
 */
export interface AIExtractionResult {
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
