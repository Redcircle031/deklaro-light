/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RecognizeResult, Scheduler } from "tesseract.js";
import { createScheduler, createWorker } from "tesseract.js";

import { preprocessImage } from "./pipeline";
import { OCR_CONFIG, TESSERACT_ASSETS } from "./config";
import type { OcrResult } from "./types";

let schedulerPromise: Promise<Scheduler> | null = null;
const registeredWorkers: any[] = [];

async function createOcrScheduler() {
  // TEMPORARY: Tesseract.js doesn't work in Node.js server environment
  // This is a stub implementation that returns mock data
  // TODO: Replace with Google Cloud Vision API or external OCR microservice

  console.log('[Tesseract] WARNING: Using stub implementation - Tesseract.js not compatible with Node.js server');
  console.log('[Tesseract] Recommendation: Switch to Google Cloud Vision API for production');

  // Create a mock scheduler that returns placeholder OCR data
  const mockScheduler = {
    addJob: async (type: string, image: any) => {
      console.log('[Tesseract Stub] Mock OCR processing for image');

      // Return mock OCR result
      return {
        data: {
          text: 'MOCK OCR RESULT\nFaktura VAT\nNumer: FV/2024/001\nData: 2024-10-22\nKwota: 1234.56 PLN',
          confidence: 85,
          words: [
            { text: 'MOCK', confidence: 85, bbox: { x0: 0, y0: 0, x1: 100, y1: 20 } },
            { text: 'OCR', confidence: 85, bbox: { x0: 110, y0: 0, x1: 150, y1: 20 } },
          ]
        }
      };
    },
    terminate: async () => {
      console.log('[Tesseract Stub] Terminating mock scheduler');
    }
  };

  return mockScheduler as any;
}

async function getScheduler() {
  if (!schedulerPromise) {
    schedulerPromise = createOcrScheduler();
  }
  return schedulerPromise;
}

function normaliseSource(source: string | Buffer | ArrayBuffer) {
  if (typeof source === "string") {
    return source;
  }

  if (source instanceof Buffer) {
    return source;
  }

  if (source instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(source));
  }

  return Buffer.from(source as Buffer);
}
function mapResult(result: RecognizeResult): OcrResult {
  const { data } = result as unknown as {
    data: RecognizeResult["data"] & {
      words: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
    };
  };

  return {
    text: data.text.trim(),
    confidence: data.confidence,
    words: data.words.map((word) => ({
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
export async function recogniseInvoice(
  source: string | Buffer | ArrayBuffer,
  options?: Parameters<typeof preprocessImage>[1],
): Promise<OcrResult> {
  const scheduler = await getScheduler();
  const preprocessed = await preprocessImage(normaliseSource(source) as Buffer, options);
  const result = await scheduler.addJob("recognize", preprocessed.buffer);
  return mapResult(result);
}

export async function terminateOcr() {
  if (!schedulerPromise) {
    return;
  }

  const scheduler = await schedulerPromise;
  await scheduler.terminate();
  await Promise.all(registeredWorkers.map((worker) => worker.terminate()));
  registeredWorkers.length = 0;
  schedulerPromise = null;
}

export async function warmupOcr() {
  await getScheduler();
}



