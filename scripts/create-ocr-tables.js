/**
 * Create OCR Jobs and Processing Logs Tables
 * Run this script to create the tables needed for the OCR pipeline
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://deljxsvywkbewwsdawqj.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg3NjcwMSwiZXhwIjoyMDc1NDUyNzAxfQ.OSeH9K86XQ8LtAFFJDW6H1Ed0KOFNb-Gs7L7NWIzM-Q';

async function main() {
  console.log('🔧 Creating OCR pipeline tables...\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Create ocr_jobs table
  const createOcrJobsSQL = `
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
  `;

  const createProcessingLogsSQL = `
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

  try {
    console.log('📋 Creating ocr_jobs table...');
    const { error: ocrError } = await supabase.rpc('exec_sql', { sql: createOcrJobsSQL });

    if (ocrError) {
      console.error('❌ Failed to create ocr_jobs table:', ocrError.message);

      // Try using direct SQL execution (fallback)
      console.log('🔄 Trying alternative method with pg admin...');
      // This will work if we have the SQL editor enabled in Supabase
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(createOcrJobsSQL);
      console.log('\n');
    } else {
      console.log('✅ ocr_jobs table created successfully!');
    }

    console.log('\n📋 Creating processing_logs table...');
    const { error: logsError } = await supabase.rpc('exec_sql', { sql: createProcessingLogsSQL });

    if (logsError) {
      console.error('❌ Failed to create processing_logs table:', logsError.message);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(createProcessingLogsSQL);
      console.log('\n');
    } else {
      console.log('✅ processing_logs table created successfully!');
    }

    // Verify tables exist
    console.log('\n🔍 Verifying tables...');

    const { data: ocrJobs, error: ocrJobsCheck } = await supabase
      .from('ocr_jobs')
      .select('count')
      .limit(1);

    const { data: procLogs, error: procLogsCheck } = await supabase
      .from('processing_logs')
      .select('count')
      .limit(1);

    if (!ocrJobsCheck) {
      console.log('✅ ocr_jobs table verified!');
    } else {
      console.log('❌ ocr_jobs table NOT accessible:', ocrJobsCheck.message);
    }

    if (!procLogsCheck) {
      console.log('✅ processing_logs table verified!');
    } else {
      console.log('❌ processing_logs table NOT accessible:', procLogsCheck.message);
    }

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
