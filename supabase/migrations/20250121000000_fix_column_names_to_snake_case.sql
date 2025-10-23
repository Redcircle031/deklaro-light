-- Migration: Fix Column Names to PostgreSQL Standard (snake_case)
-- Date: 2025-01-21
-- Purpose: Convert all camelCase column names to snake_case for PostgreSQL compatibility
-- Impact: Breaking change - requires code updates

-- ============================================================================
-- STEP 1: Rename columns in public.tenants
-- ============================================================================

ALTER TABLE "public"."tenants"
  RENAME COLUMN "stripeCustomerId" TO "stripe_customer_id";

ALTER TABLE "public"."tenants"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "public"."tenants"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 2: Rename columns in public.tenant_members
-- ============================================================================

ALTER TABLE "public"."tenant_members"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "public"."tenant_members"
  RENAME COLUMN "userId" TO "user_id";

ALTER TABLE "public"."tenant_members"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "public"."tenant_members"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 3: Rename columns in public.usage_records
-- ============================================================================

ALTER TABLE "public"."usage_records"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "public"."usage_records"
  RENAME COLUMN "invoiceCount" TO "invoice_count";

ALTER TABLE "public"."usage_records"
  RENAME COLUMN "storageBytes" TO "storage_bytes";

ALTER TABLE "public"."usage_records"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "public"."usage_records"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 4: Rename columns in tenant.companies
-- ============================================================================

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "postalCode" TO "postal_code";

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "weisValidatedAt" TO "weis_validated_at";

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "weisStatus" TO "weis_status";

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "weisData" TO "weis_data";

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "tenant"."companies"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 5: Rename columns in tenant.invoices
-- ============================================================================

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "companyId" TO "company_id";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "originalFileUrl" TO "original_file_url";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "fileName" TO "file_name";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "fileSize" TO "file_size";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "uploadedBy" TO "uploaded_by";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "invoiceType" TO "invoice_type";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "ocrProcessedAt" TO "ocr_processed_at";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "ocrConfidence" TO "ocr_confidence";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "ocrResult" TO "ocr_result";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "extractedData" TO "extracted_data";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "invoiceNumber" TO "invoice_number";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "invoiceDate" TO "invoice_date";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "dueDate" TO "due_date";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "netAmount" TO "net_amount";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "vatAmount" TO "vat_amount";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "grossAmount" TO "gross_amount";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "ksefNumber" TO "ksef_number";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "ksefSubmittedAt" TO "ksef_submitted_at";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "ksefStatus" TO "ksef_status";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "tenant"."invoices"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 6: Rename columns in tenant.invoice_line_items
-- ============================================================================

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "invoiceId" TO "invoice_id";

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "lineNumber" TO "line_number";

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "unitPrice" TO "unit_price";

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "vatRate" TO "vat_rate";

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "netAmount" TO "net_amount";

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "vatAmount" TO "vat_amount";

ALTER TABLE "tenant"."invoice_line_items"
  RENAME COLUMN "grossAmount" TO "gross_amount";

-- ============================================================================
-- STEP 7: Rename columns in tenant.ocr_jobs
-- ============================================================================

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "invoiceId" TO "invoice_id";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "preprocessedAt" TO "preprocessed_at";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "ocrStartedAt" TO "ocr_started_at";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "ocrCompletedAt" TO "ocr_completed_at";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "aiStartedAt" TO "ai_started_at";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "aiCompletedAt" TO "ai_completed_at";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "rawText" TO "raw_text";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "extractedFields" TO "extracted_fields";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "errorMessage" TO "error_message";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "errorDetails" TO "error_details";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "retryCount" TO "retry_count";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "tenant"."ocr_jobs"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 8: Rename columns in tenant.ksef_submissions
-- ============================================================================

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "invoiceId" TO "invoice_id";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "fa3Xml" TO "fa3_xml";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "submittedAt" TO "submitted_at";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "ksefNumber" TO "ksef_number";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "upoUrl" TO "upo_url";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "errorCode" TO "error_code";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "errorMessage" TO "error_message";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "errorDetails" TO "error_details";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "retryCount" TO "retry_count";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "nextRetryAt" TO "next_retry_at";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "tenant"."ksef_submissions"
  RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- STEP 9: Rename columns in tenant.audit_logs
-- ============================================================================

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "tenantId" TO "tenant_id";

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "userId" TO "user_id";

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "entityType" TO "entity_type";

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "entityId" TO "entity_id";

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "ipAddress" TO "ip_address";

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "userAgent" TO "user_agent";

ALTER TABLE "tenant"."audit_logs"
  RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- STEP 10: Drop RLS policies BEFORE dropping function
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tenant's companies" ON "tenant"."companies";
DROP POLICY IF EXISTS "Users can insert companies for their tenant" ON "tenant"."companies";
DROP POLICY IF EXISTS "Users can update their tenant's companies" ON "tenant"."companies";
DROP POLICY IF EXISTS "Users can delete their tenant's companies" ON "tenant"."companies";

DROP POLICY IF EXISTS "Users can view their tenant's invoices" ON "tenant"."invoices";
DROP POLICY IF EXISTS "Users can insert invoices for their tenant" ON "tenant"."invoices";
DROP POLICY IF EXISTS "Users can update their tenant's invoices" ON "tenant"."invoices";
DROP POLICY IF EXISTS "Users can delete their tenant's invoices" ON "tenant"."invoices";

DROP POLICY IF EXISTS "Users can view line items for their tenant's invoices" ON "tenant"."invoice_line_items";
DROP POLICY IF EXISTS "Users can insert line items for their tenant's invoices" ON "tenant"."invoice_line_items";

DROP POLICY IF EXISTS "Users can view OCR jobs for their tenant" ON "tenant"."ocr_jobs";
DROP POLICY IF EXISTS "Users can view KSeF submissions for their tenant" ON "tenant"."ksef_submissions";
DROP POLICY IF EXISTS "Users can view audit logs for their tenant" ON "tenant"."audit_logs";

-- ============================================================================
-- STEP 11: Drop and recreate indexes with new column names
-- ============================================================================

-- tenant_members
DROP INDEX IF EXISTS "tenant_members_userId_idx";
CREATE INDEX "tenant_members_user_id_idx" ON "public"."tenant_members"("user_id");

-- companies
DROP INDEX IF EXISTS "companies_tenantId_weisStatus_idx";
CREATE INDEX "companies_tenant_id_weis_status_idx" ON "tenant"."companies"("tenant_id", "weis_status");

-- invoices
DROP INDEX IF EXISTS "invoices_tenantId_status_idx";
DROP INDEX IF EXISTS "invoices_tenantId_invoiceDate_idx";
DROP INDEX IF EXISTS "invoices_tenantId_companyId_idx";
DROP INDEX IF EXISTS "invoices_ksefNumber_idx";

CREATE INDEX "invoices_tenant_id_status_idx" ON "tenant"."invoices"("tenant_id", "status");
CREATE INDEX "invoices_tenant_id_invoice_date_idx" ON "tenant"."invoices"("tenant_id", "invoice_date");
CREATE INDEX "invoices_tenant_id_company_id_idx" ON "tenant"."invoices"("tenant_id", "company_id");
CREATE INDEX "invoices_ksef_number_idx" ON "tenant"."invoices"("ksef_number");

-- invoice_line_items
DROP INDEX IF EXISTS "invoice_line_items_invoiceId_idx";
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "tenant"."invoice_line_items"("invoice_id");

-- ocr_jobs
DROP INDEX IF EXISTS "ocr_jobs_tenantId_status_idx";
CREATE INDEX "ocr_jobs_tenant_id_status_idx" ON "tenant"."ocr_jobs"("tenant_id", "status");

-- ksef_submissions
DROP INDEX IF EXISTS "ksef_submissions_tenantId_status_idx";
DROP INDEX IF EXISTS "ksef_submissions_ksefNumber_idx";

CREATE INDEX "ksef_submissions_tenant_id_status_idx" ON "tenant"."ksef_submissions"("tenant_id", "status");
CREATE INDEX "ksef_submissions_ksef_number_idx" ON "tenant"."ksef_submissions"("ksef_number");

-- audit_logs
DROP INDEX IF EXISTS "audit_logs_tenantId_createdAt_idx";
DROP INDEX IF EXISTS "audit_logs_entityType_entityId_idx";

CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "tenant"."audit_logs"("tenant_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "tenant"."audit_logs"("entity_type", "entity_id");

-- ============================================================================
-- STEP 11: Update RLS helper function
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_tenant_id();

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT AS $$
  SELECT "tenant_id"
  FROM "public"."tenant_members"
  WHERE "user_id" = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- STEP 13: Recreate RLS policies with new column names
-- ============================================================================

-- Recreate policies for companies table
CREATE POLICY "Users can view their tenant's companies"
  ON "tenant"."companies" FOR SELECT
  USING ("tenant_id" = get_user_tenant_id());

CREATE POLICY "Users can insert companies for their tenant"
  ON "tenant"."companies" FOR INSERT
  WITH CHECK ("tenant_id" = get_user_tenant_id());

CREATE POLICY "Users can update their tenant's companies"
  ON "tenant"."companies" FOR UPDATE
  USING ("tenant_id" = get_user_tenant_id());

CREATE POLICY "Users can delete their tenant's companies"
  ON "tenant"."companies" FOR DELETE
  USING ("tenant_id" = get_user_tenant_id());

-- Recreate policies for invoices table
CREATE POLICY "Users can view their tenant's invoices"
  ON "tenant"."invoices" FOR SELECT
  USING ("tenant_id" = get_user_tenant_id());

CREATE POLICY "Users can insert invoices for their tenant"
  ON "tenant"."invoices" FOR INSERT
  WITH CHECK ("tenant_id" = get_user_tenant_id());

CREATE POLICY "Users can update their tenant's invoices"
  ON "tenant"."invoices" FOR UPDATE
  USING ("tenant_id" = get_user_tenant_id());

CREATE POLICY "Users can delete their tenant's invoices"
  ON "tenant"."invoices" FOR DELETE
  USING ("tenant_id" = get_user_tenant_id());

-- Recreate policies for invoice_line_items table
CREATE POLICY "Users can view line items for their tenant's invoices"
  ON "tenant"."invoice_line_items" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "tenant"."invoices"
      WHERE "id" = "invoice_line_items"."invoice_id"
      AND "tenant_id" = get_user_tenant_id()
    )
  );

CREATE POLICY "Users can insert line items for their tenant's invoices"
  ON "tenant"."invoice_line_items" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tenant"."invoices"
      WHERE "id" = "invoice_line_items"."invoice_id"
      AND "tenant_id" = get_user_tenant_id()
    )
  );

-- Recreate policies for ocr_jobs table
CREATE POLICY "Users can view OCR jobs for their tenant"
  ON "tenant"."ocr_jobs" FOR SELECT
  USING ("tenant_id" = get_user_tenant_id());

-- Recreate policies for ksef_submissions table
CREATE POLICY "Users can view KSeF submissions for their tenant"
  ON "tenant"."ksef_submissions" FOR SELECT
  USING ("tenant_id" = get_user_tenant_id());

-- Recreate policies for audit_logs table
CREATE POLICY "Users can view audit logs for their tenant"
  ON "tenant"."audit_logs" FOR SELECT
  USING ("tenant_id" = get_user_tenant_id());

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Column names successfully migrated to snake_case!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update application code to use snake_case column names';
  RAISE NOTICE '2. Test all API endpoints';
  RAISE NOTICE '3. Re-seed test data if needed';
END $$;
