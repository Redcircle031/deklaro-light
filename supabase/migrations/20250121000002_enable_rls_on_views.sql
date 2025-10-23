-- Grant permissions for views to work with RLS
-- Views use security_invoker = true, so they inherit RLS from underlying tables
-- We just need to ensure the helper function is accessible
-- Created: 2025-01-21

-- Grant execute permission on get_user_tenant_id to authenticated users
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;

-- Grant usage on tenant schema (needed to access tenant.companies and tenant.invoices)
GRANT USAGE ON SCHEMA tenant TO authenticated;
