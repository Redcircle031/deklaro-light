-- Create usage_tracking table for tracking tenant resource usage
-- This table tracks invoice counts and storage usage per tenant per billing period

CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g., '2025-01')
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per tenant per period
    UNIQUE("tenantId", period)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_period
    ON public.usage_tracking("tenantId", period);

-- Add RLS policies
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can read their own usage data
CREATE POLICY "Tenants can read own usage"
    ON public.usage_tracking
    FOR SELECT
    USING (
        "tenantId" IN (
            SELECT tenant_id
            FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Service role can do anything (for usage tracker)
CREATE POLICY "Service role full access"
    ON public.usage_tracking
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_usage_tracking_updated_at
    BEFORE UPDATE ON public.usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.usage_tracking IS 'Tracks invoice counts and storage usage per tenant per billing period for subscription limit enforcement';
