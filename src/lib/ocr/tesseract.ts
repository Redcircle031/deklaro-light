/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RecognizeResult } from "tesseract.js";
import { createWorker } from "tesseract.js";

import { preprocessImage } from "./pipeline";
import { OCR_CONFIG } from "./config";
import type { OcrResult } from "./types";

/**
 * Create a Tesseract worker for serverless environment
 * Uses single worker instance (no scheduler) to avoid concurrency issues
 */
async function createOcrWorker() {
  console.log('[Tesseract] Creating worker for serverless environment...');

  try {
    const worker = await createWorker('pol', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[Tesseract] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      // Use CDN for language data in serverless
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    });

    console.log('[Tesseract] Worker initialized with Polish language support');
    return worker;
  } catch (error) {
    console.error('[Tesseract] Failed to create worker:', error);
    throw new Error(`Tesseract initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Normalize image source to Buffer
 */
function normaliseSource(source: string | Buffer | ArrayBuffer): Buffer {
  if (typeof source === "string") {
    // Assume base64 or file path - let Tesseract handle it
    return Buffer.from(source);
  }

  if (source instanceof Buffer) {
    return source;
  }

  if (source instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(source));
  }

  return Buffer.from(source as Buffer);
}

/**
 * Map Tesseract result to our OcrResult format
 */
function mapResult(result: RecognizeResult): OcrResult {
  const { data } = result;

  return {
    text: data.text.trim(),
    confidence: data.confidence,
    words: (data.words || []).map((word: any) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1,
      },
    })),
    language: OCR_CONFIG.languages,
  };
}

/**
 * Perform OCR on an invoice image
 *
 * @param source - Image as Buffer, ArrayBuffer, or base64 string
 * @param options - Preprocessing options (optional)
 * @returns OCR result with text, confidence, and word-level data
 */
export async function recogniseInvoice(
  source: string | Buffer | ArrayBuffer,
  options?: Parameters<typeof preprocessImage>[1],
): Promise<OcrResult> {
  console.log('[Tesseract] Starting OCR recognition...');
  const startTime = Date.now();

  // Create a new worker for each request (serverless best practice)
  const worker = await createOcrWorker();

  try {
    // Preprocess image if needed
    const imageBuffer = normaliseSource(source);
    const preprocessed = await preprocessImage(imageBuffer, options);

    // Perform OCR
    console.log('[Tesseract] Running text recognition...');
    const result = await worker.recognize(preprocessed.buffer);

    const elapsed = Date.now() - startTime;
    console.log(`[Tesseract] OCR completed in ${elapsed}ms (${result.data.text.length} chars, ${Math.round(result.data.confidence)}% confidence)`);

    return mapResult(result);
  } finally {
    // Always terminate worker to free memory (important in serverless)
    await worker.terminate();
  }
}

/**
 * Terminate OCR (no-op in new implementation, kept for compatibility)
 */
export async function terminateOcr() {
  // Workers are terminated after each use in serverless mode
  console.log('[Tesseract] terminateOcr called (no-op in serverless mode)');
}

/**
 * Warmup OCR (no-op in new implementation, kept for compatibility)
 */
export async function warmupOcr() {
  // No persistent workers in serverless mode
  console.log('[Tesseract] warmupOcr called (no-op in serverless mode)');
}



