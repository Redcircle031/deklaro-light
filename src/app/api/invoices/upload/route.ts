import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAuditLog, getClientIp, getUserAgent } from "@/lib/audit/logger";
import { checkInvoiceLimit, incrementInvoiceCount, incrementStorageUsage } from "@/lib/usage/tracker";
import { inngest } from "@/lib/queue/inngest-client";

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

export async function POST(request: NextRequest) {
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
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const storageFileName = `${tenantId}/${timestamp}-${crypto.randomUUID()}.${fileExt}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage using admin client (bypasses RLS)
      const { data, error } = await getSupabaseAdmin().storage
        .from("invoices")
        .upload(storageFileName, buffer, {
          contentType: file.type,
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
          file_name: file.name,
          file_size: file.size,
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

        // Trigger Inngest event for async OCR/AI processing
        // This prevents serverless timeout (Tesseract.js takes 30-60s+)
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
