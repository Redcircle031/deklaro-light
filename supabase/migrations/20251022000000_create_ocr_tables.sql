-- Create OCR Jobs table (without foreign key constraints for now)
CREATE TABLE IF NOT EXISTS public.ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_invoice_id ON public.ocr_jobs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_tenant_id ON public.ocr_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON public.ocr_jobs(status);

-- Create Processing Logs table
CREATE TABLE IF NOT EXISTS public.processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('OCR', 'AI_EXTRACT', 'VALIDATE', 'SAVE')),
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_job_id ON public.processing_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_tenant_id ON public.processing_logs(tenant_id);
