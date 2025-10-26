import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit/logger";
import { checkInvoiceLimit, incrementInvoiceCount, incrementStorageUsage } from "@/lib/usage/tracker";
import { inngest } from "@/lib/queue/inngest-client";
import { convertPdfToPng } from "@/lib/pdf/server-convert";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { scanFile, getScanErrorMessage } from "@/lib/security/virus-scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Lazy-initialize admin Supabase client for storage uploads (bypasses RLS)
// This prevents build-time errors when env vars aren't available
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
}

async function uploadHandler(request: NextRequest) {
  try {
    console.log("[Upload] POST request received");

    // In demo mode, return mock success
    if (!env.isConfigured) {
      return NextResponse.json(
        {
          message: "Demo mode: File upload simulated successfully",
          files: [],
          warning: "Configure Supabase to enable actual file storage",
        },
        { status: 200 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check authentication (use getUser for security)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    console.log(`[Upload] Received ${files.length} file(s)`);

    if (!files || files.length === 0) {
      console.error("[Upload] No files provided in form data");
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 },
      );
    }

    // Validate files
    for (const file of files) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File ${file.name} exceeds maximum size of 10MB`,
          },
          { status: 400 },
        );
      }
    }

    // Virus scan files before processing
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`[Upload] Scanning file for viruses: ${file.name}`);
      const scanResult = await scanFile({
        buffer,
        filename: file.name,
        mimeType: file.type,
      });

      if (!scanResult.safe) {
        const errorMessage = getScanErrorMessage(scanResult);
        console.error(`[Upload] File rejected by virus scanner: ${file.name}`, scanResult);

        return NextResponse.json(
          {
            error: errorMessage || 'File rejected for security reasons',
            fileName: file.name,
            scanResult,
          },
          { status: 400 },
        );
      }

      console.log(`[Upload] File scan passed: ${file.name} (${scanResult.provider})`);
    }

    // Get tenant ID from headers (set by middleware)
    const tenantId = request.headers.get("x-deklaro-tenant-id");

    if (!tenantId) {
      console.error("[Upload] Tenant ID not found in headers");
      return NextResponse.json(
        { error: "Tenant ID not found" },
        { status: 400 },
      );
    }

    console.log(`[Upload] Processing upload for tenant: ${tenantId}, user: ${user.id}`);

    // Check subscription limits
    const limitCheck = await checkInvoiceLimit(tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Invoice limit exceeded",
          message: `You have reached your monthly invoice limit (${limitCheck.limit} invoices). Please upgrade your subscription to continue.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
        },
        { status: 403 },
      );
    }

    // Extract OCR results from form data (if client-side OCR was performed)
    const ocrText = formData.get('ocr_text') as string | null;
    const ocrConfidence = formData.get('ocr_confidence') as string | null;

    console.log(`[Upload] Client-side OCR: ${ocrText ? 'YES' : 'NO'} (confidence: ${ocrConfidence || 'N/A'}%)`);

    // Upload files to Supabase Storage and create invoice records
    const uploadResults = [];

    for (const file of files) {
      const timestamp = Date.now();

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);
      let contentType = file.type;
      let fileExt = file.name.split(".").pop();
      let originalFileName = file.name;

      // Convert PDF to PNG for OpenAI Vision API compatibility
      if (file.type === 'application/pdf') {
        try {
          console.log(`[Upload] Converting PDF to PNG: ${file.name}`);
          buffer = await convertPdfToPng(buffer);
          contentType = 'image/png';
          fileExt = 'png';
          console.log(`[Upload] PDF converted successfully: ${originalFileName} -> ${fileExt}`);
        } catch (convertError) {
          console.error('[Upload] PDF conversion failed:', convertError);
          uploadResults.push({
            fileName: file.name,
            success: false,
            error: `PDF conversion failed: ${convertError instanceof Error ? convertError.message : 'Unknown error'}`,
          });
          continue;
        }
      }

      const storageFileName = `${tenantId}/${timestamp}-${crypto.randomUUID()}.${fileExt}`;

      // Upload to Supabase Storage using admin client (bypasses RLS)
      const { data, error } = await getSupabaseAdmin().storage
        .from("invoices")
        .upload(storageFileName, buffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: error.message,
        });
        continue;
      }

      // Create invoice record in database (using admin client to bypass RLS)
      try {
        console.log('[Upload] Creating invoice record with snake_case columns...');

        // Generate UUID for invoice ID (table doesn't have DEFAULT)
        const invoiceId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Prepare invoice data
        const invoiceData: any = {
          id: invoiceId,
          tenant_id: tenantId,
          original_file_url: data.path,
          file_name: originalFileName, // Keep original PDF filename
          file_size: buffer.length, // Use converted buffer size
          uploaded_by: user.id,
          status: ocrText ? "UPLOADED_WITH_OCR" : "UPLOADED", // Mark if OCR already done
          currency: "PLN",
          created_at: now,
          updated_at: now,
        };

        // If client-side OCR was performed, save the results
        if (ocrText && ocrConfidence) {
          invoiceData.ocr_result = ocrText;
          invoiceData.ocr_confidence = parseInt(ocrConfidence);
          invoiceData.ocr_processed_at = now;
        }

        const { data: invoice, error: dbError} = await getSupabaseAdmin()
          .from("invoices")
          .insert(invoiceData)
          .select()
          .single();

        if (dbError) {
          console.error('[Upload] Database error:', dbError);
          throw dbError || new Error("Failed to create invoice record");
        }

        if (!invoice) {
          throw new Error("Failed to create invoice record");
        }

        console.log('[Upload] Invoice created successfully:', invoice.id);

        // Process with GPT-4 Vision immediately (fast: 5-15s)
        try {
          console.log('[Upload] Starting GPT-4 Vision extraction...');
          const startTime = Date.now();

          // Import Vision extraction
          const { extractInvoiceWithVision } = await import('@/lib/ai/vision-extraction');

          // Get file from storage
          const { data: urlData } = await getSupabaseAdmin().storage
            .from('invoices')
            .createSignedUrl(data.path, 3600);

          if (urlData?.signedUrl) {
            // Download file
            const fileResponse = await fetch(urlData.signedUrl);
            const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

            // Run Vision extraction (OCR + AI in one call)
            const visionResult = await extractInvoiceWithVision(fileBuffer);
            const elapsed = Date.now() - startTime;

            console.log(`[Upload] Vision extraction completed in ${elapsed}ms`);

            const extraction = visionResult.extracted_data;
            const confidenceScores = visionResult.confidence_scores || {};
            const normalizeDateField = (value?: string | null) =>
              value ? `${value}T00:00:00.000Z` : null;

            // Update invoice with extracted data (using tenant.* snake_case columns)
            const { error: updateError } = await getSupabaseAdmin()
              .from('invoices')
              .update({
                invoice_number: extraction.invoice_number ?? null,
                invoice_date: normalizeDateField(extraction.issue_date),
                due_date: normalizeDateField(extraction.due_date),
                net_amount: extraction.net_amount ?? null,
                vat_amount: extraction.vat_amount ?? null,
                gross_amount: extraction.gross_amount ?? null,
                currency: extraction.currency ?? 'PLN',
                extracted_data: extraction,
                confidence_scores: confidenceScores,
                ocr_confidence_overall: Math.round(confidenceScores.overall ?? 0),
                status: 'PROCESSED',
                ocr_processed_at: new Date().toISOString(),
              })
              .eq('id', invoice.id);

            if (updateError) {
              console.error('[Upload] ❌ Failed to update invoice:', updateError);
              throw updateError;
            }

            console.log('[Upload] ✅ Invoice updated successfully with extracted data');
            console.log('[Upload] Invoice Number:', extraction.invoice_number);
            console.log('[Upload] Gross Amount:', extraction.gross_amount);
          }
        } catch (extractionError) {
          // Log detailed error information
          console.error('[Upload] ❌ Vision extraction FAILED - Details:');
          console.error('[Upload] Error message:', extractionError instanceof Error ? extractionError.message : extractionError);
          console.error('[Upload] Error stack:', extractionError instanceof Error ? extractionError.stack : 'No stack');
          console.error('[Upload] Error type:', typeof extractionError);
          console.error('[Upload] Full error object:', JSON.stringify(extractionError, null, 2));

          // Try Inngest as fallback
          await inngest.send({
            name: 'invoice/uploaded',
            data: {
              invoice_id: invoice.id,
              tenant_id: tenantId,
              file_path: data.path,
            },
          }).catch((err) => {
            console.error(`Failed to trigger OCR for invoice ${invoice.id}:`, err);
          });
        }

        // Increment usage counters
        await Promise.all([
          incrementInvoiceCount(tenantId),
          incrementStorageUsage(tenantId, file.size),
        ]);

        // Log audit trail
        createAuditLog({
          tenantId,
          userId: user.id,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: invoice.id,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
          },
          ipAddress: getClientIp(request.headers),
          userAgent: getUserAgent(request.headers),
        }).catch((err) => {
          console.error('[Upload] Failed to create audit log:', err);
        });

        uploadResults.push({
          fileName: file.name,
          success: true,
          storagePath: data.path,
          invoiceId: invoice.id,
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: "Failed to create invoice record",
        });
      }
    }

    const successCount = uploadResults.filter((r) => r.success).length;
    const failureCount = uploadResults.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Uploaded ${successCount} file(s) successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
      results: uploadResults,
    });
  } catch (error) {
    console.error("Upload endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Apply rate limiting: 10 uploads per 15 minutes per tenant
export const POST = withRateLimit(
  uploadHandler,
  RATE_LIMITS.UPLOAD,
  'invoice-upload'
);
