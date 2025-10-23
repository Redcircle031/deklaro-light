/**
 * Shared TypeScript types for OCR UI Components
 *
 * This file defines props interfaces for the 3 OCR components
 * and re-exports types from types/ocr.ts for convenience.
 */

import type {
  ExtractedData,
  ConfidenceScores,
  CompanyInfo,
  LineItem,
  Currency,
  InvoiceType,
  ProcessingStep,
} from '@/types/ocr';

import type {
  OCRStatusResponse,
  Correction,
  ReviewRequest,
  ReviewResponse,
  ApproveResponse,
} from '@/lib/api/ocr-client';

// Re-export for convenience
export type {
  ExtractedData,
  ConfidenceScores,
  CompanyInfo,
  LineItem,
  Currency,
  InvoiceType,
  ProcessingStep,
  OCRStatusResponse,
  Correction,
  ReviewRequest,
  ReviewResponse,
  ApproveResponse,
};

/**
 * Props for ConfidenceIndicator component
 */
export interface ConfidenceIndicatorProps {
  /** Confidence score (0-100) */
  confidence: number;

  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Show confidence level text (High/Medium/Low) */
  showLabel?: boolean;

  /** Optional custom className */
  className?: string;
}

/**
 * Confidence level (derived from score)
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Props for OCRProcessingStatus component
 */
export interface OCRProcessingStatusProps {
  /** UUID of the OCR job to track */
  jobId: string;

  /** Current tenant ID (from middleware context) */
  tenantId: string;

  /** Callback when job completes successfully */
  onComplete?: (result: OCRJobResult) => void;

  /** Callback when job fails */
  onError?: (error: string) => void;

  /** Optional polling interval in milliseconds (default: 2000) */
  pollingInterval?: number;
}

/**
 * OCR job result (returned when status is COMPLETED)
 */
export interface OCRJobResult {
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
  ocr_confidence_overall: number;
  requires_review: boolean;
  raw_ocr_text: string;
}

/**
 * Props for ReviewExtractedData component
 */
export interface ReviewExtractedDataProps {
  /** UUID of the invoice being reviewed */
  invoiceId: string;

  /** Current tenant ID (from middleware context) */
  tenantId: string;

  /** Extracted invoice data (from OCR + AI) */
  extractedData: ExtractedData;

  /** Per-field confidence scores (0-100) */
  confidenceScores: ConfidenceScores;

  /** Raw OCR text for side-by-side comparison */
  rawOcrText: string;

  /** Whether invoice is already approved (read-only mode) */
  isApproved?: boolean;

  /** Callback when corrections saved successfully */
  onSave?: (corrections: Correction[]) => void;

  /** Optional: Show raw OCR text viewer (default: true) */
  showRawText?: boolean;
}

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Form validation state
 */
export interface ValidationState {
  isValid: boolean;
  errors: Record<string, string>;
}
