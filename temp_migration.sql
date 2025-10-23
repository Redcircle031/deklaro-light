CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("tenantId", period)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_period
    ON public.usage_tracking("tenantId", period);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
