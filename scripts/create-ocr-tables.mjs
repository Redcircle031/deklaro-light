/**
 * Create OCR Jobs and Processing Logs Tables
 */

import pg from 'pg';
const { Client } = pg;

const SQL = `
-- Create OCR Jobs table
CREATE TABLE IF NOT EXISTS public.ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
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
  job_id UUID NOT NULL REFERENCES public.ocr_jobs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('OCR', 'AI_EXTRACT', 'VALIDATE', 'SAVE')),
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_job_id ON public.processing_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_tenant_id ON public.processing_logs(tenant_id);
`;

async function main() {
  console.log('🔧 Creating OCR pipeline tables...\n');

  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.deljxsvywkbewwsdawqj',
    password: 'TgbYhnUjm!23',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📋 Running migration SQL...');
    await client.query(SQL);
    console.log('✅ Migration completed successfully!\n');

    // Verify tables
    const { rows } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('ocr_jobs', 'processing_logs')
      ORDER BY tablename;
    `);

    console.log('📊 Created tables:');
    rows.forEach((row) => console.log(`   - ${row.tablename}`));
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
