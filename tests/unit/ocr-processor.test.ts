import { describe, expect, it, vi } from 'vitest';

const recogniseInvoiceMock = vi.hoisted(() => vi.fn(async () => ({
  text: 'Sample invoice text',
  confidence: 92,
  words: [],
  language: 'pol+eng',
})));

vi.mock('@/lib/ocr/tesseract', () => ({
  recogniseInvoice: recogniseInvoiceMock,
}));

import { processInvoiceImage } from '@/lib/ocr/services/processor';

const SAMPLE_BUFFER = Buffer.from('fake-image-data');

describe('processInvoiceImage', () => {
  it('returns processed OCR result with status', async () => {
    const result = await processInvoiceImage(SAMPLE_BUFFER, {
      minimumConfidence: 0.8,
    });
    expect(result.status).toBe('ok');
    expect(result.text).toContain('Sample invoice text');
  });

  it('marks low-confidence result', async () => {
    recogniseInvoiceMock.mockResolvedValueOnce({
      text: 'Low confidence',
      confidence: 60,
      words: [],
      language: 'pol+eng',
    });
    const result = await processInvoiceImage(SAMPLE_BUFFER, {
      minimumConfidence: 0.9,
    });
    expect(result.status).toBe('low-confidence');
  });
});

