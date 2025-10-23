# Supabase Edge Functions

This directory contains Deno-based Edge Functions that run on Supabase's infrastructure.

## Directory Structure

```
functions/
├── _shared/              # Shared utilities across functions
│   └── cors.ts          # CORS headers and handling
├── ocr-processor/       # OCR text extraction function
│   └── index.ts         # Tesseract.js OCR processing
└── ai-data-extractor/   # AI-powered data extraction
    └── index.ts         # OpenAI GPT-4 extraction
```

## OCR Processor Function

**Trigger**: Database webhook on `ocr_jobs` table inserts with `status = 'QUEUED'`

**Purpose**: Extracts text from uploaded invoice images using Tesseract.js OCR

**Workflow**:
1. Receives webhook payload with new OCR job
2. Updates job status to `PROCESSING`
3. Downloads invoice file from Supabase Storage
4. Runs OCR with Polish language model (`pol`)
5. Stores extracted text in `ocr_jobs.raw_text`
6. Updates status to `TEXT_EXTRACTED` (triggers AI extraction pipeline)

## AI Data Extractor Function

**Trigger**: Database webhook on `ocr_jobs` table updates where `status = 'TEXT_EXTRACTED'`

**Purpose**: Extracts structured invoice data from OCR text using OpenAI GPT-4

**Workflow**:
1. Receives webhook payload with OCR job containing `raw_text`
2. Sends text to OpenAI API with specialized Polish invoice extraction prompt
3. Parses structured JSON response with confidence scores
4. **Classifies invoice type** (INCOMING/OUTGOING):
   - Checks if supplier VAT ID matches tenant → OUTGOING (sale)
   - Checks if buyer VAT ID matches tenant → INCOMING (purchase)
   - Otherwise → UNKNOWN (requires manual classification)
5. Updates `invoices` table with extracted data:
   - Invoice number, dates, currency
   - Supplier and buyer details (name, VAT ID, address)
   - Line items with quantities and prices
   - Totals (subtotal, tax, total)
   - **Invoice type and classification confidence**
6. Updates OCR job status to `COMPLETED`
7. Invoice status becomes `EXTRACTED` (ready for user review)

**AI Model**: `gpt-4o-mini` (configurable via `OPENAI_MODEL` env var)

**Output Schema**:
```typescript
{
  supplier: { name, vatId, address, confidence },
  buyer: { name, vatId, address, confidence },
  header: { number, issueDate, dueDate, currency, confidence },
  totals: { subtotal, tax, total, currency, confidence },
  lineItems: [{ description, quantity, unitPrice, total, confidence }],
  notes: string[],
  locale: string,
  confidenceOverall: number
}
```

**Classification Logic**:
- **OUTGOING** (confidence: 1.0): Supplier VAT ID matches tenant's company VAT ID
- **INCOMING** (confidence: 1.0): Buyer VAT ID matches tenant's company VAT ID
- **UNKNOWN** (confidence: 0.5): No VAT ID match found (user must classify manually)

## Development

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Deno runtime (installed automatically with Supabase CLI)

### Local Testing

```bash
# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Start local Supabase (includes Edge Functions runtime)
npx supabase start

# Serve functions locally
npx supabase functions serve ocr-processor --env-file .env.local
npx supabase functions serve ai-data-extractor --env-file .env.local

# Test OCR processor with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/ocr-processor' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"record":{"id":"test-job-id","invoice_id":"test-invoice-id"}}'

# Test AI extractor with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/ai-data-extractor' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"record":{"id":"test-job-id","invoice_id":"test-invoice-id","raw_text":"FV/100/2025..."}}'
```

### Deployment

```bash
# Deploy individual functions
npx supabase functions deploy ocr-processor
npx supabase functions deploy ai-data-extractor

# Deploy all functions at once
npx supabase functions deploy

# Set secrets (required for AI extraction)
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

### Environment Variables

**Automatically provided by Supabase:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access key

**Required for AI Data Extractor:**
- `OPENAI_API_KEY` - Your OpenAI API key (set via `npx supabase secrets set`)
- `OPENAI_MODEL` - Model to use (default: `gpt-4o-mini`, can use `gpt-4o` for better accuracy)

### Database Webhook Setup

Create two webhooks in Supabase Dashboard (Database → Webhooks):

#### Webhook 1: OCR Processor Trigger
1. **Name**: `ocr-processor-trigger`
2. **Table**: `ocr_jobs`
3. **Events**: `INSERT` (triggers when new jobs are created)
4. **Conditions**: `status = 'QUEUED'`
5. **HTTP Request**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/ocr-processor`
   - Method: `POST`
   - Headers: `Authorization: Bearer <service-role-key>`

#### Webhook 2: AI Data Extractor Trigger
1. **Name**: `ai-extractor-trigger`
2. **Table**: `ocr_jobs`
3. **Events**: `UPDATE` (triggers when OCR completes)
4. **Conditions**: `status = 'TEXT_EXTRACTED'`
5. **HTTP Request**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/ai-data-extractor`
   - Method: `POST`
   - Headers: `Authorization: Bearer <service-role-key>`

## Complete Processing Pipeline

The invoice processing follows this automated workflow:

```
1. User uploads invoice → Supabase Storage
2. OCR job created → status: QUEUED
3. Webhook triggers → ocr-processor function
4. Tesseract extracts text → status: TEXT_EXTRACTED
5. Webhook triggers → ai-data-extractor function
6. OpenAI extracts structured data → status: COMPLETED
7. Invoice updated with extracted data → status: EXTRACTED
8. User reviews and approves data in UI
```

## Performance Expectations

- **OCR Processing**: 5-30 seconds depending on image size/quality
- **AI Extraction**: 2-10 seconds depending on text length
- **Total Pipeline**: ~10-40 seconds per invoice
- **Concurrent Processing**: Both functions can process multiple invoices in parallel

## Error Handling

Both functions implement:
- Automatic retry logic (up to 2-3 retries with exponential backoff)
- Status updates on failure (`FAILED` status with error_message)
- Detailed error logging for debugging
- Graceful degradation (partial data extraction on low confidence)

## Cost Considerations

- **Tesseract.js**: Free, runs in-memory
- **OpenAI API**: ~$0.0001-0.0005 per invoice (using gpt-4o-mini)
- **Supabase Edge Functions**: First 500k requests/month free
- **Supabase Storage**: First 1GB free

## Notes

- Edge Functions run on Deno, not Node.js
- Use Deno-compatible imports (e.g., `https://esm.sh/` for npm packages)
- Tesseract.js uses WASM, works in Deno environments
- Image preprocessing (sharp) is Node.js-only; use WASM alternatives in Deno
- AI extraction includes confidence scores for quality assurance
- Low confidence fields should be flagged for manual review in UI
