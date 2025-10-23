-- Create public schema views for tenant schema tables
-- This allows Supabase PostgREST API to access tenant data while maintaining schema separation
-- Created: 2025-01-21

-- ============================================================================
-- PUBLIC VIEWS FOR TENANT SCHEMA TABLES
-- ============================================================================

-- Drop existing objects if they exist (handles name conflicts)
DROP TABLE IF EXISTS "public"."companies" CASCADE;
DROP TABLE IF EXISTS "public"."invoices" CASCADE;

-- View for tenant.companies
CREATE OR REPLACE VIEW "public"."companies" AS
SELECT
  id,
  tenant_id,
  nip,
  name,
  address,
  city,
  postal_code,
  country,
  weis_validated_at,
  weis_status,
  weis_data,
  metadata,
  created_at,
  updated_at
FROM "tenant"."companies";

-- View for tenant.invoices
CREATE OR REPLACE VIEW "public"."invoices" AS
SELECT
  id,
  tenant_id,
  company_id,
  original_file_url,
  file_name,
  file_size,
  uploaded_by,
  status,
  invoice_type,
  ocr_processed_at,
  ocr_confidence,
  ocr_result,
  extracted_data,
  invoice_number,
  invoice_date,
  due_date,
  currency,
  net_amount,
  vat_amount,
  gross_amount,
  ksef_number,
  ksef_submitted_at,
  ksef_status,
  metadata,
  created_at,
  updated_at
FROM "tenant"."invoices";

-- Note: Additional views for invoice_line_items, ocr_jobs, ksef_submissions
-- can be added later when needed

-- ============================================================================
-- ROW-LEVEL SECURITY ON VIEWS
-- ============================================================================
-- Views inherit RLS from underlying tables, but we enable it explicitly for clarity

ALTER VIEW "public"."companies" SET (security_invoker = true);
ALTER VIEW "public"."invoices" SET (security_invoker = true);

-- ============================================================================
-- GRANTS
-- ============================================================================
-- Grant access to authenticated users (RLS policies will filter the data)

GRANT SELECT ON "public"."companies" TO authenticated;
GRANT SELECT ON "public"."invoices" TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW "public"."companies" IS 'Public view of tenant.companies - filtered by RLS policies';
COMMENT ON VIEW "public"."invoices" IS 'Public view of tenant.invoices - filtered by RLS policies';
