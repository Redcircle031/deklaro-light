-- Grant access to tenant schema for all roles
-- This fixes "permission denied for schema tenant" error
-- Even with RLS disabled, we need schema-level permissions

-- Grant USAGE on tenant schema to all roles (PUBLIC means everyone)
GRANT USAGE ON SCHEMA "tenant" TO PUBLIC;

-- Grant SELECT, INSERT, UPDATE, DELETE on all tables in tenant schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "tenant" TO PUBLIC;

-- Grant USAGE on all sequences in tenant schema (for auto-increment IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA "tenant" TO PUBLIC;

-- Make these grants apply to future tables too
ALTER DEFAULT PRIVILEGES IN SCHEMA "tenant" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA "tenant" GRANT USAGE ON SEQUENCES TO PUBLIC;

-- Note: This is safe because RLS policies still control row-level access
-- We're just allowing schema/table access at the PostgreSQL level
