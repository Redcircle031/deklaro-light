-- Create RPC function to insert invoices (bypasses RLS for service role)
-- This is a workaround until we migrate tables to public schema

CREATE OR REPLACE FUNCTION create_invoice(
  p_id TEXT,
  p_tenant_id TEXT,
  p_original_file_url TEXT,
  p_file_name TEXT,
  p_file_size INTEGER,
  p_uploaded_by TEXT,
  p_status TEXT,
  p_currency TEXT,
  p_created_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with function creator's privileges (bypasses RLS)
AS $$
DECLARE
  v_invoice JSONB;
BEGIN
  -- Insert into tenant.invoices table
  INSERT INTO "tenant"."invoices" (
    "id",
    "tenantId",
    "originalFileUrl",
    "fileName",
    "fileSize",
    "uploadedBy",
    "status",
    "currency",
    "createdAt",
    "updatedAt"
  ) VALUES (
    p_id,
    p_tenant_id,
    p_original_file_url,
    p_file_name,
    p_file_size,
    p_uploaded_by,
    p_status::tenant."InvoiceStatus",
    p_currency,
    p_created_at,
    p_updated_at
  )
  RETURNING to_jsonb("tenant"."invoices".*) INTO v_invoice;

  RETURN v_invoice;
END;
$$;
