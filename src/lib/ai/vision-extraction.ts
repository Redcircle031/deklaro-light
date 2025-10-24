/**
 * OpenAI Vision API - Fast Invoice OCR + Extraction
 *
 * Uses GPT-4 Vision to do BOTH OCR and structured data extraction in one API call.
 * Much faster than Tesseract.js + GPT-4 separately (~5-10s vs 60s+).
 * Perfect for serverless environments with timeout constraints.
 */

import { getOpenAIClient } from './openai-client';
import type { AIExtractionResult } from '@/types/ocr';
import { AIExtractionResponseSchema } from './schemas/invoice-schema';

const VISION_EXTRACTION_PROMPT = `You are an expert at reading Polish invoices (faktury VAT).

Analyze this invoice image and extract ALL data into this exact JSON structure:

{
  "extracted_data": {
    "invoice_number": "string (numer faktury, e.g. FV/2024/001)",
    "issue_date": "YYYY-MM-DD (data wystawienia)",
    "due_date": "YYYY-MM-DD (termin płatności)",
    "sale_date": "YYYY-MM-DD (data sprzedaży) or null",
    "payment_method": "string (forma płatności: przelew/gotówka/karta) or null",
    "net_amount": number (kwota netto in PLN),
    "vat_amount": number (kwota VAT in PLN),
    "gross_amount": number (kwota brutto in PLN),
    "currency": "PLN",
    "seller": {
      "name": "string (nazwa sprzedawcy)",
      "nip": "string (10 digits, NIP sprzedawcy)",
      "address": "string (full address)"
    },
    "buyer": {
      "name": "string (nazwa nabywcy)",
      "nip": "string (10 digits, NIP nabywcy)",
      "address": "string (full address)"
    }
  },
  "confidence": {
    "overall": number (0-100, how confident you are),
    "invoice_number": number (0-100),
    "dates": number (0-100),
    "amounts": number (0-100),
    "seller": number (0-100),
    "buyer": number (0-100)
  }
}

CRITICAL RULES:
- NIP must be exactly 10 digits (remove hyphens/spaces)
- All amounts in PLN (decimal numbers)
- Dates in YYYY-MM-DD format
- If you can't read something clearly, use null and lower confidence
- Verify: gross_amount should equal net_amount + vat_amount

Return ONLY the JSON, nothing else.`;

/**
 * Extract invoice data using GPT-4 Vision (OCR + extraction in one call)
 *
 * @param imageBuffer - Invoice image as Buffer
 * @returns Extracted data with confidence scores
 */
export async function extractInvoiceWithVision(
  imageBuffer: Buffer
): Promise<AIExtractionResult> {
  const startTime = Date.now();

  try {
    console.log('[Vision Extraction] Starting GPT-4 Vision analysis...');

    const openai = getOpenAIClient();

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Call GPT-4 Vision with JSON mode
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: VISION_EXTRACTION_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high', // High detail for better OCR
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from GPT-4 Vision');
    }

    console.log('[Vision Extraction] Raw response:', responseText);

    // Parse and validate JSON
    const parsed = JSON.parse(responseText);
    const validated = AIExtractionResponseSchema.parse(parsed);

    const duration = Date.now() - startTime;
    const tokenUsage = {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
    };

    console.log(
      `[Vision Extraction] Completed in ${duration}ms (${tokenUsage.total_tokens} tokens)`
    );

    return {
      extracted_data: validated.extracted_data,
      confidence_scores: validated.confidence,
      token_usage: tokenUsage,
    };
  } catch (error) {
    console.error('[Vision Extraction] Failed:', error);

    if (error instanceof Error) {
      throw new Error(`Vision extraction failed: ${error.message}`);
    }

    throw new Error('Vision extraction failed with unknown error');
  }
}
