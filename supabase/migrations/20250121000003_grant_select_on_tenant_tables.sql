-- Grant SELECT permissions on tenant schema tables
-- This allows authenticated users to query through the public views
-- Created: 2025-01-21

-- Grant SELECT on tenant.companies
GRANT SELECT ON TABLE "tenant"."companies" TO authenticated;

-- Grant SELECT on tenant.invoices
GRANT SELECT ON TABLE "tenant"."invoices" TO authenticated;
