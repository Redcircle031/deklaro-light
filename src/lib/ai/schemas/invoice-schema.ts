/**
 * Zod Schemas for Invoice Data Extraction
 *
 * These schemas provide runtime validation for OCR-extracted invoice data
 * and AI-generated structured outputs from OpenAI GPT-4.
 *
 * @see specs/002-ocr-pipeline/contracts/job-status.yaml
 * @see src/types/ocr.ts
 */

import { z } from 'zod';

// ============================================================================
// Basic Types
// ============================================================================

/**
 * Currency enum schema
 */
export const CurrencySchema = z.enum(['PLN', 'EUR', 'USD']);

/**
 * VAT rate enum schema (Polish VAT rates)
 */
export const VATRateSchema = z.union([
  z.literal(23),
  z.literal(8),
  z.literal(5),
  z.literal(0),
]);

/**
 * Invoice type enum schema
 */
export const InvoiceTypeSchema = z.enum(['SALE', 'PURCHASE', 'CORRECTION']);

/**
 * OCR job status schema
 */
export const OCRJobStatusSchema = z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']);

/**
 * Processing step schema
 */
export const ProcessingStepSchema = z.enum([
  'UPLOAD',
  'PREPROCESS',
  'OCR',
  'AI_EXTRACT',
  'VALIDATE',
  'SAVE',
]);

// ============================================================================
// Extracted Data Schemas
// ============================================================================

/**
 * Company information schema
 */
export const CompanyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  nip: z.string().regex(/^\d{10}$/, 'NIP must be 10 digits'),
  address: z.string().nullable().optional(),
});

/**
 * Line item schema
 */
export const LineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().nonnegative('Unit price must be non-negative'),
  vat_rate: VATRateSchema,
  net: z.number().nonnegative('Net amount must be non-negative'),
  vat: z.number().nonnegative('VAT amount must be non-negative'),
  gross: z.number().nonnegative('Gross amount must be non-negative'),
});

/**
 * Extracted invoice data schema
 * Used to validate AI extraction output from OpenAI GPT-4
 */
export const ExtractedDataSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  seller: CompanyInfoSchema,
  buyer: CompanyInfoSchema,
  currency: CurrencySchema,
  net_amount: z.number().nonnegative('Net amount must be non-negative'),
  vat_amount: z.number().nonnegative('VAT amount must be non-negative'),
  gross_amount: z.number().nonnegative('Gross amount must be non-negative'),
  line_items: z.array(LineItemSchema).min(0, 'Line items must be an array'),
  invoice_type: InvoiceTypeSchema,
});

/**
 * Confidence scores schema
 */
export const ConfidenceScoresSchema = z.object({
  invoice_number: z.number().int().min(0).max(100),
  issue_date: z.number().int().min(0).max(100),
  due_date: z.number().int().min(0).max(100),
  seller_name: z.number().int().min(0).max(100),
  seller_nip: z.number().int().min(0).max(100),
  buyer_name: z.number().int().min(0).max(100),
  buyer_nip: z.number().int().min(0).max(100),
  net_amount: z.number().int().min(0).max(100),
  vat_amount: z.number().int().min(0).max(100),
  gross_amount: z.number().int().min(0).max(100),
  line_items: z.number().int().min(0).max(100),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

/**
 * POST /api/ocr/process request schema
 */
export const ProcessOCRRequestSchema = z.object({
  invoice_id: z.string().uuid('Invoice ID must be a valid UUID'),
  options: z
    .object({
      skip_preprocessing: z.boolean().optional(),
      force_reprocess: z.boolean().optional(),
      language: z.enum(['pol', 'eng']).optional(),
    })
    .optional(),
});

/**
 * POST /api/ocr/process response schema
 */
export const ProcessOCRResponseSchema = z.object({
  job_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  status: z.enum(['QUEUED', 'PROCESSING']),
  created_at: z.string().datetime(),
  estimated_completion: z.string().datetime(),
});

/**
 * OCR result schema (included in COMPLETED status)
 */
export const OCRResultSchema = z.object({
  extracted_data: ExtractedDataSchema,
  confidence_scores: ConfidenceScoresSchema,
  ocr_confidence_overall: z.number().int().min(0).max(100),
  requires_review: z.boolean(),
  raw_ocr_text: z.string().optional(),
});

/**
 * GET /api/ocr/status/{job_id} response schemas
 */
export const OCRStatusQueuedSchema = z.object({
  job_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  status: z.literal('QUEUED'),
  created_at: z.string().datetime(),
  queue_position: z.number().int().positive(),
});

export const OCRStatusProcessingSchema = z.object({
  job_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  status: z.literal('PROCESSING'),
  created_at: z.string().datetime(),
  started_at: z.string().datetime(),
  current_step: ProcessingStepSchema,
  progress: z.number().int().min(0).max(100),
  estimated_completion: z.string().datetime(),
});

export const OCRStatusCompletedSchema = z.object({
  job_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  status: z.literal('COMPLETED'),
  created_at: z.string().datetime(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  duration_ms: z.number().int().positive(),
  result: OCRResultSchema,
});

export const OCRStatusFailedSchema = z.object({
  job_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  status: z.literal('FAILED'),
  created_at: z.string().datetime(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  error: z.object({
    message: z.string(),
    step: ProcessingStepSchema,
    details: z.record(z.unknown()).optional(),
  }),
  retry_count: z.number().int().nonnegative(),
  will_retry: z.boolean(),
});

/**
 * Union schema for all OCR status responses
 */
export const OCRStatusSchema = z.discriminatedUnion('status', [
  OCRStatusQueuedSchema,
  OCRStatusProcessingSchema,
  OCRStatusCompletedSchema,
  OCRStatusFailedSchema,
]);

// ============================================================================
// Review & Correction Schemas
// ============================================================================

/**
 * Field correction schema
 */
export const CorrectionSchema = z.object({
  field_name: z.string().min(1, 'Field name is required'),
  corrected_value: z.union([z.string(), z.number()]),
  original_value: z.union([z.string(), z.number(), z.null()]).optional(),
});

/**
 * POST /api/invoices/{id}/review request schema
 */
export const ReviewInvoiceRequestSchema = z.object({
  corrections: z.array(CorrectionSchema).min(1, 'At least one correction is required'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

/**
 * POST /api/invoices/{id}/review response schema
 */
export const ReviewInvoiceResponseSchema = z.object({
  invoice_id: z.string().uuid(),
  corrections_applied: z.number().int().positive(),
  reviewed_at: z.string().datetime(),
  reviewed_by: z.string().uuid(),
  updated_data: ExtractedDataSchema,
});

/**
 * POST /api/invoices/{id}/approve response schema
 */
export const ApproveInvoiceResponseSchema = z.object({
  invoice_id: z.string().uuid(),
  approved_at: z.string().datetime(),
  approved_by: z.string().uuid(),
  status: z.literal('VERIFIED'),
});

// ============================================================================
// AI Extraction Schema (for OpenAI GPT-4 JSON mode)
// ============================================================================

/**
 * Complete AI extraction response schema
 * This is sent to GPT-4 as the expected JSON structure
 */
export const AIExtractionResponseSchema = z.object({
  extracted_data: ExtractedDataSchema,
  confidence: ConfidenceScoresSchema,
});

// ============================================================================
// Type Exports (inferred from Zod schemas)
// ============================================================================

export type Currency = z.infer<typeof CurrencySchema>;
export type VATRate = z.infer<typeof VATRateSchema>;
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;
export type OCRJobStatus = z.infer<typeof OCRJobStatusSchema>;
export type ProcessingStep = z.infer<typeof ProcessingStepSchema>;
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;
export type ConfidenceScores = z.infer<typeof ConfidenceScoresSchema>;
export type ProcessOCRRequest = z.infer<typeof ProcessOCRRequestSchema>;
export type ProcessOCRResponse = z.infer<typeof ProcessOCRResponseSchema>;
export type OCRResult = z.infer<typeof OCRResultSchema>;
export type OCRStatusQueued = z.infer<typeof OCRStatusQueuedSchema>;
export type OCRStatusProcessing = z.infer<typeof OCRStatusProcessingSchema>;
export type OCRStatusCompleted = z.infer<typeof OCRStatusCompletedSchema>;
export type OCRStatusFailed = z.infer<typeof OCRStatusFailedSchema>;
export type OCRStatus = z.infer<typeof OCRStatusSchema>;
export type Correction = z.infer<typeof CorrectionSchema>;
export type ReviewInvoiceRequest = z.infer<typeof ReviewInvoiceRequestSchema>;
export type ReviewInvoiceResponse = z.infer<typeof ReviewInvoiceResponseSchema>;
export type ApproveInvoiceResponse = z.infer<typeof ApproveInvoiceResponseSchema>;
export type AIExtractionResponse = z.infer<typeof AIExtractionResponseSchema>;
