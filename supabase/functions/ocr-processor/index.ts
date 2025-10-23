import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createWorker } from "https://esm.sh/tesseract.js@v5.0.0";

console.log("OCR Processor function booting up...");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  try {
    // The request body for a database webhook is the new record
    const { record: ocrJob } = await req.json();
    console.log(`Processing OCR job: ${ocrJob.id}`);

    // 1. Update job status to PROCESSING
    await supabaseAdmin
      .from("ocr_jobs")
      .update({ status: "PROCESSING", started_at: new Date().toISOString() })
      .eq("id", ocrJob.id);

    // 2. Get the invoice file path from the related invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("original_file_url")
      .eq("id", ocrJob.invoice_id)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error(`Invoice not found for job ${ocrJob.id}`);

    const filePath = new URL(invoice.original_file_url).pathname.split("/invoices/")[1];

    // 3. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("invoices")
      .download(filePath);

    if (downloadError) throw downloadError;

    const imageBuffer = new Uint8Array(await fileData.arrayBuffer());

    // --- Image Preprocessing (Future Enhancement) ---
    // The original plan specified `sharp`, which is a Node.js library.
    // In a Deno environment, a WASM-based library like `image-rs` would be used here
    // for operations like deskewing, contrast adjustment, and noise removal.
    // For now, we proceed directly to OCR.
    // const preprocessedBuffer = await preprocessImage(imageBuffer);

    // 4. Perform OCR using Tesseract.js
    console.log("Initializing Tesseract worker...");
    const worker = await createWorker("pol"); // Using Polish language model
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();
    console.log("OCR complete.");

    // 5. Update the OCRJob with the extracted text
    const { error: updateError } = await supabaseAdmin
      .from("ocr_jobs")
      .update({
        raw_text: text,
        status: "TEXT_EXTRACTED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", ocrJob.id);

    if (updateError) throw updateError;

    // The next step (AI Data Extraction) will be triggered by another webhook
    // listening for `ocr_jobs` updates where status becomes `TEXT_EXTRACTED`.

    return new Response(JSON.stringify({ success: true, message: `Job ${ocrJob.id} processed.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in OCR Processor:", error.message);
    // Attempt to get the job ID from the payload even on failure
    const payload = await req.json().catch(() => ({}));
    const jobId = payload?.record?.id;

    if (jobId) {
      await supabaseAdmin
        .from("ocr_jobs")
        .update({ status: "FAILED", error_message: error.message })
        .eq("id", jobId);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});