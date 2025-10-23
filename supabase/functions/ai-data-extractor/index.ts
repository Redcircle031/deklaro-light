import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

console.log("AI Data Extractor function booting up...");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// OpenAI Client Setup
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set!");
}

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
  "confidenceOverall": number
}
Confidence scores must be between 0 and 1.`;

const FEW_SHOT_EXAMPLE = `Example OCR snippet:
"""
FV/100/2025
Data wystawienia: 02-01-2025
Termin platnosci: 16-01-2025
Sprzedawca: ABC Sp. z o.o., NIP 521-123-45-67, Al. Jana Pawla II 12, 00-124 Warszawa
Nabywca: XYZ S.A., NIP 945-987-32-10, ul. Zielona 5, 31-345 Krakow
Pozycje:
1. Usluga ksiegowa; 10 szt.; 120,00 PLN; 1 200,00 PLN
VAT 23%: 276,00 PLN
Razem brutto: 1 476,00 PLN
"""

Expected Output:
{
  "supplier": { "name": "ABC Sp. z o.o.", "vatId": "521-123-45-67", "address": "Al. Jana Pawla II 12, 00-124 Warszawa", "confidence": 0.95 },
  "buyer": { "name": "XYZ S.A.", "vatId": "945-987-32-10", "address": "ul. Zielona 5, 31-345 Krakow", "confidence": 0.95 },
  "header": { "number": "FV/100/2025", "issueDate": "2025-01-02", "dueDate": "2025-01-16", "currency": "PLN", "confidence": 0.98 },
  "totals": { "subtotal": 1200.00, "tax": 276.00, "total": 1476.00, "currency": "PLN", "confidence": 0.97 },
  "lineItems": [{ "description": "Usluga ksiegowa", "quantity": 10, "unitPrice": 120.00, "total": 1200.00, "confidence": 0.96 }],
  "notes": [],
  "locale": "pl-PL",
  "confidenceOverall": 0.96
}`;

function buildUserPrompt(ocrText: string) {
  return [
    FEW_SHOT_INSTRUCTION,
    FEW_SHOT_EXAMPLE,
    "Target OCR text:",
    '"""',
    ocrText.trim(),
    '"""',
  ].join("\n");
}

async function extractWithOpenAI(ocrText: string, retries = 2): Promise<any> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(ocrText) },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content?.trim();

      if (!message) {
        throw new Error("OpenAI returned an empty response.");
      }

      return JSON.parse(message);
    } catch (error) {
      lastError = error as Error;
      attempt += 1;

      if (attempt > retries) {
        throw error;
      }

      console.log(`Retry ${attempt}/${retries} after error:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  try {
    // Webhook payload contains the updated OCR job
    const { record: ocrJob } = await req.json();
    console.log(`Processing AI extraction for OCR job: ${ocrJob.id}`);

    // Validate that we have raw_text
    if (!ocrJob.raw_text || ocrJob.raw_text.trim() === "") {
      throw new Error("OCR job has no raw_text to process");
    }

    // 1. Extract structured data using OpenAI
    console.log("Calling OpenAI API for data extraction...");
    const extractedData = await extractWithOpenAI(ocrJob.raw_text);
    console.log("AI extraction complete. Confidence:", extractedData.confidenceOverall);

    // 1.5. Classify invoice type (INCOMING/OUTGOING)
    let invoiceType = "UNKNOWN";
    let classificationConfidence = 0;

    // Get tenant NIP from the invoice record
    const { data: invoiceData } = await supabaseAdmin
      .from("invoices")
      .select("tenant_id")
      .eq("id", ocrJob.invoice_id)
      .single();

    if (invoiceData?.tenant_id) {
      const { data: tenantData } = await supabaseAdmin
        .from("tenants")
        .select("company_vat_id")
        .eq("id", invoiceData.tenant_id)
        .single();

      const tenantNip = tenantData?.company_vat_id;

      // Heuristic classification based on NIP matching
      if (tenantNip) {
        if (extractedData.supplier?.vatId === tenantNip) {
          invoiceType = "OUTGOING";
          classificationConfidence = 1.0;
          console.log("Classified as OUTGOING (supplier NIP matches tenant)");
        } else if (extractedData.buyer?.vatId === tenantNip) {
          invoiceType = "INCOMING";
          classificationConfidence = 1.0;
          console.log("Classified as INCOMING (buyer NIP matches tenant)");
        } else {
          console.log("Could not classify invoice type - NIP does not match supplier or buyer");
          invoiceType = "UNKNOWN";
          classificationConfidence = 0.5;
        }
      }
    }

    // 2. Update the invoice with extracted data
    const invoiceUpdate = {
      invoice_number: extractedData.header?.number,
      issue_date: extractedData.header?.issueDate,
      due_date: extractedData.header?.dueDate,
      currency: extractedData.header?.currency || extractedData.totals?.currency || "PLN",

      supplier_name: extractedData.supplier?.name,
      supplier_vat_id: extractedData.supplier?.vatId,
      supplier_address: extractedData.supplier?.address,

      buyer_name: extractedData.buyer?.name,
      buyer_vat_id: extractedData.buyer?.vatId,
      buyer_address: extractedData.buyer?.address,

      subtotal: extractedData.totals?.subtotal,
      tax_amount: extractedData.totals?.tax,
      total_amount: extractedData.totals?.total,

      line_items: extractedData.lineItems || [],
      extracted_data: extractedData,
      ai_confidence: extractedData.confidenceOverall,
      type: invoiceType,
      classification_confidence: classificationConfidence,
      status: "EXTRACTED",
      processed_at: new Date().toISOString(),
    };

    const { error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .update(invoiceUpdate)
      .eq("id", ocrJob.invoice_id);

    if (invoiceError) throw invoiceError;

    // 3. Update OCR job status
    const { error: ocrError } = await supabaseAdmin
      .from("ocr_jobs")
      .update({
        status: "COMPLETED",
        extracted_data: extractedData,
        completed_at: new Date().toISOString(),
      })
      .eq("id", ocrJob.id);

    if (ocrError) throw ocrError;

    console.log(`Successfully processed invoice ${ocrJob.invoice_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `AI extraction completed for job ${ocrJob.id}`,
        confidence: extractedData.confidenceOverall,
        invoiceType,
        classificationConfidence,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in AI Data Extractor:", (error as Error).message);

    // Try to update OCR job status to FAILED
    try {
      const payload = await req.json().catch(() => ({}));
      const jobId = payload?.record?.id;

      if (jobId) {
        await supabaseAdmin
          .from("ocr_jobs")
          .update({
            status: "FAILED",
            error_message: (error as Error).message,
          })
          .eq("id", jobId);
      }
    } catch (updateError) {
      console.error("Failed to update job status:", (updateError as Error).message);
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
