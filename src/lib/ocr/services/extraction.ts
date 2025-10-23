/**
 * OCR + AI Extraction Service Integration
 *
 * Combines Tesseract OCR with OpenAI GPT-4 extraction for complete invoice processing.
 * This file bridges the gap between old code and new services.
 */

import { recogniseInvoice } from '../tesseract';
import type { OcrResult } from '../types';
import { extractInvoiceData, calculateOverallConfidence, requiresReview } from '@/lib/ai/extraction-service';
import type { ExtractedData, ConfidenceScores } from '@/lib/ai/schemas/invoice-schema';

export type InvoiceFullExtractionResult = {
  ocr: {
    text: string;
    confidence: number;
    status: 'success' | 'low-confidence';
  };
  extraction: {
    header: {
      number: string;
      issueDate: string | null;
      dueDate: string | null;
    };
    supplier: {
      name: string;
      vatId: string;
      address?: string | null;
    };
    buyer: {
      name: string;
      vatId: string;
      address?: string | null;
    };
    totals: {
      subtotal: number;
      tax: number;
      total: number;
      currency: string;
    };
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    confidenceOverall: number;
    confidenceScores: ConfidenceScores;
  };
};

/**
 * Process invoice image through OCR and AI extraction pipeline
 *
 * @param source - Image buffer or file path
 * @param options - Processing options
 * @returns OCR result + extracted structured data
 */
export async function processAndExtractInvoice(
  source: string | Buffer | ArrayBuffer,
  options?: {
    skipExtractionOnLowConfidence?: boolean;
    grayscale?: boolean;
    normalize?: boolean;
    rotate?: boolean;
  }
): Promise<InvoiceFullExtractionResult> {
  // Step 1: Run OCR with Tesseract
  const ocrResult: OcrResult = await recogniseInvoice(source, options);

  // Check OCR confidence
  const ocrStatus = ocrResult.confidence >= 60 ? 'success' : 'low-confidence';

  if (options?.skipExtractionOnLowConfidence && ocrStatus === 'low-confidence') {
    throw new Error('OCR confidence below threshold - skipping GPT extraction.');
  }

  // Step 2: Extract structured data with AI
  const aiResult = await extractInvoiceData(ocrResult.text);

  // Step 3: Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(aiResult.confidence_scores);

  // Step 4: Map to expected format (for backward compatibility)
  return {
    ocr: {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      status: ocrStatus,
    },
    extraction: {
      header: {
        number: aiResult.extracted_data.invoice_number,
        issueDate: aiResult.extracted_data.issue_date,
        dueDate: aiResult.extracted_data.due_date,
      },
      supplier: {
        name: aiResult.extracted_data.seller.name,
        vatId: aiResult.extracted_data.seller.nip,
        address: aiResult.extracted_data.seller.address,
      },
      buyer: {
        name: aiResult.extracted_data.buyer.name,
        vatId: aiResult.extracted_data.buyer.nip,
        address: aiResult.extracted_data.buyer.address,
      },
      totals: {
        subtotal: aiResult.extracted_data.net_amount,
        tax: aiResult.extracted_data.vat_amount,
        total: aiResult.extracted_data.gross_amount,
        currency: aiResult.extracted_data.currency,
      },
      lineItems: aiResult.extracted_data.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.gross,
      })),
      confidenceOverall: overallConfidence,
      confidenceScores: aiResult.confidence_scores,
    },
  };
}
