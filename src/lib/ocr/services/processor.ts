import type { OcrResult } from '@/lib/ocr/types';
import { recogniseInvoice } from '@/lib/ocr/tesseract';

export type OcrProcessorOptions = {
  /** reject results with confidence under this value */
  minimumConfidence?: number;
  /** pass through to preprocessing pipeline */
  preprocess?: Parameters<typeof recogniseInvoice>[1];
};

export type OcrProcessorResult = OcrResult & {
  status: 'ok' | 'low-confidence';
};

export async function processInvoiceImage(
  source: string | Buffer | ArrayBuffer,
  options: OcrProcessorOptions = {},
): Promise<OcrProcessorResult> {
  const minimumConfidence = options.minimumConfidence ?? 0.8;
  const result = await recogniseInvoice(source, options.preprocess);
  const status = result.confidence / 100 >= minimumConfidence ? 'ok' : 'low-confidence';
  return { ...result, status };
}

