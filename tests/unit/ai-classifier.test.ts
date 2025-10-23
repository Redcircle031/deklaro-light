import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: createMock,
        },
      },
    })),
  };
});

import { classifyInvoiceType } from '@/lib/ai/classifier';
import type { InvoiceExtraction } from '@/lib/ai/extractor';

const extraction: InvoiceExtraction = {
  supplier: { name: 'ABC', vatId: '123', address: 'Warszawa', confidence: 0.9 },
  buyer: { name: 'XYZ', vatId: '456', address: 'Kraków', confidence: 0.9 },
  header: { number: 'FV/1', issueDate: '2025-01-02', dueDate: '2025-01-16', currency: 'PLN', confidence: 0.9 },
  totals: { subtotal: 1000, tax: 230, total: 1230, currency: 'PLN', confidence: 0.9 },
  lineItems: [],
  notes: [],
  locale: 'pl-PL',
  model: 'gpt-4o-mini',
  confidenceOverall: 0.9,
  rawText: 'FV sample',
};

describe('classifyInvoiceType', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    createMock.mockReset();
  });

  it('classifies as OUTGOING when supplier NIP matches tenant', async () => {
    const tenantNip = '123';
    const result = await classifyInvoiceType(extraction, tenantNip);
    expect(result.type).toBe('OUTGOING');
    expect(result.confidence).toBe(1.0);
    expect(result.rationale).toContain('OUTGOING');
  });

  it('classifies as INCOMING when buyer NIP matches tenant', async () => {
    const tenantNip = '456';
    const result = await classifyInvoiceType(extraction, tenantNip);
    expect(result.type).toBe('INCOMING');
    expect(result.confidence).toBe(1.0);
    expect(result.rationale).toContain('INCOMING');
  });

  it('falls back to AI when NIP does not match', async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              type: 'OUTGOING',
              confidence: 0.92,
              rationale: 'Supplier matches our VAT ID as issuer.',
            }),
          },
        },
      ],
    });

    const tenantNip = '999'; // No match
    const result = await classifyInvoiceType(extraction, tenantNip);
    expect(result.type).toBe('OUTGOING');
    expect(result.confidence).toBeCloseTo(0.92);
  });

  it('returns UNKNOWN on AI failure', async () => {
    createMock.mockRejectedValueOnce(new Error('API Error'));

    const tenantNip = '999';
    const result = await classifyInvoiceType(extraction, tenantNip);
    expect(result.type).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });
});
