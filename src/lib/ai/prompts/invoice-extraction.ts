/**
 * GPT-4 Prompts for Polish Invoice Data Extraction
 *
 * These prompts guide GPT-4 to extract structured invoice data from raw OCR text.
 * Optimized for Polish invoices (FV/VAT invoices).
 *
 * @see specs/002-ocr-pipeline/research.md - Polish invoice format patterns
 */

/**
 * System prompt for invoice extraction
 */
export const INVOICE_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured data from Polish invoices (Faktura VAT).

Your task is to extract key information from OCR text and return it in valid JSON format.

IMPORTANT RULES:
1. Extract only information that is clearly present in the OCR text
2. For missing fields, use null
3. Polish currency is PLN unless stated otherwise
4. NIP (tax ID) is always 10 digits
5. Dates should be in YYYY-MM-DD format
6. Amounts must be numeric (no currency symbols)
7. VAT rates in Poland: 23%, 8%, 5%, 0%

COMMON POLISH TERMS:
- "Sprzedawca" = Seller
- "Nabywca" = Buyer
- "Data wystawienia" = Issue date
- "Termin płatności" = Due date
- "Wartość netto" = Net amount
- "VAT" = VAT amount
- "Wartość brutto" = Gross amount
- "Razem" / "Do zapłaty" = Total to pay`;

/**
 * Generate user prompt with OCR text
 */
export function generateExtractionPrompt(ocrText: string): string {
  return `Extract invoice data from this Polish invoice OCR text.

Return ONLY valid JSON matching this exact structure:

{
  "extracted_data": {
    "invoice_number": "string",
    "issue_date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD or null",
    "seller": {
      "name": "string",
      "nip": "1234567890",
      "address": "string or null"
    },
    "buyer": {
      "name": "string",
      "nip": "1234567890",
      "address": "string or null"
    },
    "currency": "PLN",
    "net_amount": number,
    "vat_amount": number,
    "gross_amount": number,
    "line_items": [
      {
        "description": "string",
        "quantity": number,
        "unit_price": number,
        "vat_rate": 23,
        "net": number,
        "vat": number,
        "gross": number
      }
    ],
    "invoice_type": "SALE"
  },
  "confidence": {
    "invoice_number": 95,
    "issue_date": 90,
    "due_date": 85,
    "seller_name": 92,
    "seller_nip": 98,
    "buyer_name": 88,
    "buyer_nip": 97,
    "net_amount": 96,
    "vat_amount": 94,
    "gross_amount": 97,
    "line_items": 89
  }
}

Confidence scores (0-100) indicate how certain you are about each extracted field.

OCR Text:
${ocrText}`;
}

/**
 * Fallback prompt for low-confidence extractions
 */
export function generateReextractionPrompt(
  ocrText: string,
  previousAttempt: unknown
): string {
  return `The previous extraction had low confidence. Please re-extract with extra care.

Previous attempt:
${JSON.stringify(previousAttempt, null, 2)}

OCR Text:
${ocrText}

Focus on:
1. Invoice number (usually starts with FV/, FK/, or just a number)
2. Dates (look for "Data wystawienia", "Termin płatności")
3. NIP numbers (10 digits, often formatted as XXX-XXX-XX-XX)
4. Amounts (look for "netto", "VAT", "brutto", "razem")

Return the JSON in the same format as before, but with improved accuracy.`;
}
