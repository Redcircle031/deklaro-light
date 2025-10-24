/**
 * AI-Powered Invoice Data Extraction Service
 *
 * Uses OpenAI GPT-4 to extract structured data from raw OCR text.
 * Includes retry logic, confidence scoring, and validation.
 *
 * @see specs/002-ocr-pipeline/contracts/job-status.yaml
 */

import { getOpenAIClient, AI_CONFIG } from './openai-client';
import {
  INVOICE_EXTRACTION_SYSTEM_PROMPT,
  generateExtractionPrompt,
} from './prompts/invoice-extraction';
import {
  AIExtractionResponseSchema,
  type AIExtractionResponse,
  type ExtractedData,
  type ConfidenceScores,
} from './schemas/invoice-schema';
import type { AIExtractionResult } from '@/types/ocr';

/**
 * Extract structured invoice data from OCR text using GPT-4
 *
 * @param ocrText - Raw text from Tesseract.js OCR
 * @returns Extracted data with confidence scores and token usage
 */
export async function extractInvoiceData(
  ocrText: string
): Promise<AIExtractionResult> {
  const startTime = Date.now();

  try {
    console.log('[AI Extraction] Starting GPT-4 extraction...');

    // Get OpenAI client (lazy initialization)
    const openai = getOpenAIClient();

    // Call OpenAI GPT-4 with JSON mode
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: INVOICE_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: generateExtractionPrompt(ocrText),
        },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      response_format: { type: 'json_object' }, // Enable JSON mode
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from GPT-4');
    }

    // Parse and validate JSON response
    const parsed = JSON.parse(responseText) as AIExtractionResponse;
    const validated = AIExtractionResponseSchema.parse(parsed);

    const duration = Date.now() - startTime;
    const tokenUsage = {
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0,
    };

    console.log(
      `[AI Extraction] Completed in ${duration}ms (${tokenUsage.total_tokens} tokens, ~$${((tokenUsage.total_tokens / 1000) * 0.01).toFixed(4)})`
    );

    return {
      extracted_data: validated.extracted_data,
      confidence_scores: validated.confidence,
      token_usage: tokenUsage,
    };
  } catch (error) {
    console.error('[AI Extraction] Failed:', error);

    if (error instanceof Error) {
      // Check if it's a Zod validation error
      if (error.message.includes('ZodError')) {
        throw new Error(
          `AI extraction produced invalid data structure: ${error.message}`
        );
      }
      throw new Error(`AI extraction failed: ${error.message}`);
    }

    throw new Error('AI extraction failed with unknown error');
  }
}

/**
 * Calculate overall confidence score from individual field scores
 *
 * @param scores - Confidence scores for each field
 * @returns Overall confidence percentage (0-100)
 */
export function calculateOverallConfidence(
  scores: ConfidenceScores
): number {
  const values = Object.values(scores);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
}

/**
 * Determine if manual review is required based on confidence
 *
 * @param overallConfidence - Overall confidence score
 * @param criticalFieldScores - Scores for critical fields (invoice_number, amounts)
 * @returns True if review required
 */
export function requiresReview(
  overallConfidence: number,
  criticalFieldScores: {
    invoice_number: number;
    net_amount: number;
    vat_amount: number;
    gross_amount: number;
  }
): boolean {
  const threshold = parseInt(
    process.env.OCR_CONFIDENCE_THRESHOLD || '80'
  );

  // Overall confidence below threshold
  if (overallConfidence < threshold) {
    return true;
  }

  // Any critical field below 70%
  const criticalThreshold = 70;
  if (Object.values(criticalFieldScores).some((score) => score < criticalThreshold)) {
    return true;
  }

  return false;
}

/**
 * Validate extracted data for basic consistency
 *
 * @param data - Extracted invoice data
 * @returns True if data passes validation
 */
export function validateExtractedData(data: ExtractedData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!data.invoice_number || data.invoice_number.trim() === '') {
    errors.push('Invoice number is missing');
  }

  if (!data.issue_date) {
    errors.push('Issue date is missing');
  }

  // Check NIP format (10 digits)
  const nipRegex = /^\d{10}$/;
  if (!nipRegex.test(data.seller.nip)) {
    errors.push(`Seller NIP invalid: ${data.seller.nip}`);
  }
  if (!nipRegex.test(data.buyer.nip)) {
    errors.push(`Buyer NIP invalid: ${data.buyer.nip}`);
  }

  // Check amount consistency (gross = net + vat, with 1 PLN tolerance for rounding)
  const calculatedGross = data.net_amount + data.vat_amount;
  const difference = Math.abs(calculatedGross - data.gross_amount);
  if (difference > 1) {
    errors.push(
      `Amount mismatch: net (${data.net_amount}) + VAT (${data.vat_amount}) != gross (${data.gross_amount})`
    );
  }

  // Check amounts are positive
  if (data.net_amount < 0 || data.vat_amount < 0 || data.gross_amount < 0) {
    errors.push('Amounts cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
