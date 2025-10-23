'use client';

/**
 * Client-Side OCR Hook
 *
 * Uses Tesseract.js to process invoices in the browser.
 * This avoids the Node.js worker thread issues and is completely free.
 */

import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export interface UseClientOCRReturn {
  processImage: (file: File) => Promise<OCRResult>;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export function useClientOCR(): UseClientOCRReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (file: File): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const startTime = Date.now();

    try {
      console.log('[Client OCR] Starting Tesseract.js processing...');

      // Create worker with Polish + English languages
      const worker = await createWorker(['pol', 'eng'], 1, {
        logger: (m) => {
          console.log('[Tesseract]', m);

          // Update progress based on Tesseract status
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      console.log('[Client OCR] Worker created, starting recognition...');

      // Process the image
      const result = await worker.recognize(file);

      console.log('[Client OCR] Recognition complete!');

      // Terminate worker to free memory
      await worker.terminate();

      const processingTime = Date.now() - startTime;

      const ocrResult: OCRResult = {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime,
      };

      console.log(`[Client OCR] Processed in ${processingTime}ms with ${ocrResult.confidence.toFixed(1)}% confidence`);

      setIsProcessing(false);
      setProgress(100);

      return ocrResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      console.error('[Client OCR] Error:', errorMessage);

      setError(errorMessage);
      setIsProcessing(false);

      throw err;
    }
  }, []);

  return {
    processImage,
    isProcessing,
    progress,
    error,
  };
}
