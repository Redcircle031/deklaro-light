-- OCR Pipeline Migration
-- Feature: 002-ocr-pipeline
-- Date: 2025-01-21
-- Description: Add OCR job tracking, processing logs, and correction history tables

-- =============================================================================
-- 1. Create ocr_jobs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS "tenant"."ocr_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
  "invoice_id" UUID NOT NULL REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient status queries
CREATE INDEX idx_ocr_jobs_status ON "tenant"."ocr_jobs"("tenant_id", "status");
CREATE INDEX idx_ocr_jobs_invoice ON "tenant"."ocr_jobs"("invoice_id");

-- RLS Policy
ALTER TABLE "tenant"."ocr_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ocr_jobs_tenant_isolation" ON "tenant"."ocr_jobs"
  FOR ALL
  USING ("tenant_id" = "tenant"."get_user_tenant_id"());

-- =============================================================================
-- 2. Create processing_logs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS "tenant"."processing_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
  "ocr_job_id" UUID NOT NULL REFERENCES "tenant"."ocr_jobs"("id") ON DELETE CASCADE,
  "step" TEXT NOT NULL CHECK (step IN ('UPLOAD', 'PREPROCESS', 'OCR', 'AI_EXTRACT', 'VALIDATE', 'SAVE')),
  "status" TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
  "details" JSONB,
  "duration_ms" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for job history queries
CREATE INDEX idx_processing_logs_job ON "tenant"."processing_logs"("ocr_job_id", "created_at");

-- RLS Policy
ALTER TABLE "tenant"."processing_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processing_logs_tenant_isolation" ON "tenant"."processing_logs"
  FOR ALL
  USING ("tenant_id" = "tenant"."get_user_tenant_id"());

-- =============================================================================
-- 3. Alter invoices table to add OCR columns
-- =============================================================================

ALTER TABLE "tenant"."invoices"
  ADD COLUMN IF NOT EXISTS "ocr_raw_text" TEXT,
  ADD COLUMN IF NOT EXISTS "ocr_confidence_overall" INTEGER CHECK ("ocr_confidence_overall" BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS "extracted_data" JSONB,
  ADD COLUMN IF NOT EXISTS "confidence_scores" JSONB,
  ADD COLUMN IF NOT EXISTS "requires_review" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reviewed_by" UUID REFERENCES "auth"."users"("id"),
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;

-- Index for review workflow queries
CREATE INDEX IF NOT EXISTS idx_invoices_requires_review
  ON "tenant"."invoices"("tenant_id", "requires_review")
  WHERE "requires_review" = TRUE;

-- =============================================================================
-- 4. Create correction_history table
-- =============================================================================

CREATE TABLE IF NOT EXISTS "tenant"."correction_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
  "invoice_id" UUID NOT NULL REFERENCES "tenant"."invoices"("id") ON DELETE CASCADE,
  "field_name" TEXT NOT NULL,
  "original_value" TEXT,
  "corrected_value" TEXT NOT NULL,
  "original_confidence" INTEGER CHECK ("original_confidence" BETWEEN 0 AND 100),
  "corrected_by" UUID NOT NULL REFERENCES "auth"."users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ML training data queries
CREATE INDEX idx_correction_history_field ON "tenant"."correction_history"("field_name", "original_confidence");
CREATE INDEX idx_correction_history_invoice ON "tenant"."correction_history"("invoice_id");

-- RLS Policy
ALTER TABLE "tenant"."correction_history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "correction_history_tenant_isolation" ON "tenant"."correction_history"
  FOR ALL
  USING ("tenant_id" = "tenant"."get_user_tenant_id"());

-- =============================================================================
-- 5. Grant permissions to authenticated users
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tenant"."ocr_jobs" TO authenticated;
GRANT SELECT, INSERT ON TABLE "tenant"."processing_logs" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "tenant"."correction_history" TO authenticated;

-- =============================================================================
-- 6. Create public views for API access (matching existing pattern)
-- =============================================================================

-- OCR Jobs view
CREATE OR REPLACE VIEW "public"."ocr_jobs"
WITH (security_invoker = true) AS
SELECT
  id, tenant_id, invoice_id, status, started_at, completed_at,
  error_message, retry_count, max_retries, created_at, updated_at
FROM "tenant"."ocr_jobs";

GRANT SELECT ON "public"."ocr_jobs" TO authenticated;

-- Processing Logs view
CREATE OR REPLACE VIEW "public"."processing_logs"
WITH (security_invoker = true) AS
SELECT
  id, tenant_id, ocr_job_id, step, status, details, duration_ms, created_at
FROM "tenant"."processing_logs";

GRANT SELECT ON "public"."processing_logs" TO authenticated;

-- Correction History view
CREATE OR REPLACE VIEW "public"."correction_history"
WITH (security_invoker = true) AS
SELECT
  id, tenant_id, invoice_id, field_name, original_value, corrected_value,
  original_confidence, corrected_by, created_at
FROM "tenant"."correction_history";

GRANT SELECT ON "public"."correction_history" TO authenticated;

-- =============================================================================
-- Migration complete
-- =============================================================================
