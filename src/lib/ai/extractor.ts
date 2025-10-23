import type OpenAI from "openai";

import { getOpenAIClient } from "./client";

export type InvoiceParty = {
  name: string | null;
  vatId: string | null;
  address: string | null;
  confidence: number;
};

export type InvoiceLineItem = {
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
  confidence: number;
};

export type InvoiceTotals = {
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  confidence: number;
};

export type InvoiceHeader = {
  number: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string | null;
  confidence: number;
};

export type InvoiceExtraction = {
  supplier: InvoiceParty;
  buyer: InvoiceParty;
  header: InvoiceHeader;
  totals: InvoiceTotals;
  lineItems: InvoiceLineItem[];
  notes: string[];
  locale: string;
  model: string;
  confidenceOverall: number;
  rawText: string;
};

export type InvoiceExtractionOptions = {
  locale?: string;
  model?: string;
  retries?: number;
  hints?: string[];
  client?: OpenAI;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const MAX_RETRIES = Number(process.env.OPENAI_MAX_RETRIES ?? "2");

const SYSTEM_PROMPT = `You are an assistant that extracts structured data from Polish VAT invoices.
Return JSON only. Use decimal points for numbers. Format dates as ISO YYYY-MM-DD.
Include confidence scores between 0 and 1 for every object you output.
If data is missing, set value to null but keep the field.`;

const FEW_SHOT_INSTRUCTION = `Schema:
{
  "supplier": { "name": string|null, "vatId": string|null, "address": string|null, "confidence": number },
  "buyer": { "name": string|null, "vatId": string|null, "address": string|null, "confidence": number },
  "header": { "number": string|null, "issueDate": string|null, "dueDate": string|null, "currency": string|null, "confidence": number },
  "totals": { "subtotal": number|null, "tax": number|null, "total": number|null, "currency": string|null, "confidence": number },
  "lineItems": [{ "description": string|null, "quantity": number|null, "unitPrice": number|null, "total": number|null, "confidence": number }],
  "notes": [string],
  "locale": string,
  "model": string,
  "confidenceOverall": number,
  "rawText": string
}
Confidence scores must be between 0 and 1.`;

const FEW_SHOT_EXAMPLE = `Example OCR snippet:
"""
FV/100/2025
Data wystawienia: 02-01-2025
Termin platnosci: 16-01-2025
Sprzedawca: ABC Sp. z o.o., NIP 521-123-45-67, Al. Jana Pawla II 12, 00-124 Warszawa
Nabywca: XYZ S.A., NIP 945-987-32-10, ul. Zielona 5, 31-345 Kraków
Pozycje:
1. Usluga ksiegowa; 10 szt.; 120,00 PLN; 1 200,00 PLN
VAT 23%: 276,00 PLN
Razem brutto: 1 476,00 PLN
"""
`;

function buildUserPrompt(ocrText: string, locale: string, hints: string[]) {
  const segments = [
    FEW_SHOT_INSTRUCTION,
    FEW_SHOT_EXAMPLE,
    `Locale: ${locale}`,
    hints.length ? `Hints: ${hints.join("; ")}` : undefined,
    "Target OCR text:",
    "\"\"\"",
    ocrText.trim(),
    "\"\"\"",
  ].filter(Boolean);

  return segments.join("\n");
}
async function withRetries<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}

export async function extractInvoiceData(
  ocrText: string,
  options: InvoiceExtractionOptions = {},
): Promise<InvoiceExtraction> {
  const trimmed = ocrText?.trim();
  if (!trimmed) {
    throw new Error("Cannot extract invoice data from empty OCR text.");
  }

  const client = options.client ?? getOpenAIClient();
  const model = options.model ?? DEFAULT_MODEL;
  const locale = options.locale ?? "pl-PL";
  const retries = options.retries ?? MAX_RETRIES;
  const hints = options.hints ?? [];

  const response = await withRetries(
    () =>
      client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(trimmed, locale, hints) },
        ],
      }),
    retries,
  );

  const message = response.choices[0]?.message?.content?.trim();
  if (!message) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: InvoiceExtraction;
  try {
    parsed = JSON.parse(message) as InvoiceExtraction;
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${(error as Error).message}`);
  }

  return {
    ...parsed,
    locale,
    model,
    rawText: trimmed,
  };
}

