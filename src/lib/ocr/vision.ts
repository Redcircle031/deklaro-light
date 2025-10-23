/**
 * Google Cloud Vision API OCR Service
 *
 * This replaces Tesseract.js which doesn't work in Node.js server environments.
 * Google Cloud Vision provides superior OCR accuracy (95-99%) and supports Polish language.
 */

import vision from '@google-cloud/vision';
import type { OcrResult } from './types';

let visionClient: vision.ImageAnnotatorClient | null = null;

/**
 * Get or create Vision API client
 * Uses credentials from GOOGLE_APPLICATION_CREDENTIALS env var or application default credentials
 */
function getVisionClient() {
  if (!visionClient) {
    // Check if running in production with credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
      visionClient = new vision.ImageAnnotatorClient();
      console.log('[Vision OCR] Initialized with Google Cloud credentials');
    } else {
      console.log('[Vision OCR] No credentials found - using mock mode');
      return null;
    }
  }
  return visionClient;
}

/**
 * Perform OCR on an image using Google Cloud Vision API
 *
 * @param imageBuffer - Image buffer (JPEG, PNG, etc.)
 * @returns OCR result with text, confidence, and word-level data
 */
export async function recogniseInvoiceWithVision(
  imageBuffer: Buffer
): Promise<OcrResult> {
  const client = getVisionClient();

  // If no credentials, return mock data (development mode)
  if (!client) {
    console.log('[Vision OCR] Mock mode - returning sample data');
    return {
      text: 'FAKTURA VAT\nNumer: FV/2024/001\nData wystawienia: 2024-10-22\nNIP sprzedawcy: 1234567890\nKwota brutto: 1234.56 PLN',
      confidence: 85,
      words: [
        { text: 'FAKTURA', confidence: 95, bbox: { x0: 10, y0: 10, x1: 150, y1: 40 } },
        { text: 'VAT', confidence: 95, bbox: { x0: 160, y0: 10, x1: 220, y1: 40 } },
      ],
      language: 'pol+eng',
    };
  }

  try {
    console.log('[Vision OCR] Processing image with Google Cloud Vision...');

    // Perform document text detection (best for invoices)
    const [result] = await client.documentTextDetection({
      image: { content: imageBuffer },
      imageContext: {
        languageHints: ['pl', 'en'], // Polish and English
      },
    });

    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      throw new Error('No text detected in image');
    }

    // Extract text
    const text = fullTextAnnotation.text.trim();

    // Calculate average confidence
    const pages = fullTextAnnotation.pages || [];
    let totalConfidence = 0;
    let wordCount = 0;

    const words: OcrResult['words'] = [];

    pages.forEach((page) => {
      page.blocks?.forEach((block) => {
        block.paragraphs?.forEach((paragraph) => {
          paragraph.words?.forEach((word) => {
            const wordText = word.symbols?.map((s) => s.text).join('') || '';
            const wordConfidence = word.confidence || 0;

            // Get bounding box
            const vertices = word.boundingBox?.vertices || [];
            const bbox =
              vertices.length >= 2
                ? {
                    x0: vertices[0].x || 0,
                    y0: vertices[0].y || 0,
                    x1: vertices[2]?.x || vertices[1]?.x || 0,
                    y1: vertices[2]?.y || vertices[1]?.y || 0,
                  }
                : { x0: 0, y0: 0, x1: 0, y1: 0 };

            words.push({
              text: wordText,
              confidence: wordConfidence * 100, // Convert to 0-100 scale
              bbox,
            });

            totalConfidence += wordConfidence;
            wordCount++;
          });
        });
      });
    });

    const averageConfidence = wordCount > 0 ? (totalConfidence / wordCount) * 100 : 0;

    console.log(`[Vision OCR] Extracted ${text.length} characters, ${wordCount} words, ${averageConfidence.toFixed(1)}% confidence`);

    return {
      text,
      confidence: Math.round(averageConfidence),
      words,
      language: 'pol+eng',
    };
  } catch (error) {
    console.error('[Vision OCR] Error:', error);
    throw new Error(`Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Warmup function (no-op for Vision API, but kept for compatibility)
 */
export async function warmupOcr() {
  console.log('[Vision OCR] Warmup called (no-op for Cloud Vision)');
}

/**
 * Cleanup function (no-op for Vision API, but kept for compatibility)
 */
export async function terminateOcr() {
  console.log('[Vision OCR] Terminate called (no-op for Cloud Vision)');
  visionClient = null;
}
