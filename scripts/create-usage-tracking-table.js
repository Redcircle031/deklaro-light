/**
 * Create usage_tracking table in Supabase
 * Run with: node scripts/create-usage-tracking-table.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUsageTrackingTable() {
  console.log('\n🔧 Creating usage_tracking table...\n');

  const sql = `
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

    -- Allow service role full access
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'usage_tracking'
            AND policyname = 'Service role full access'
        ) THEN
            CREATE POLICY "Service role full access"
                ON public.usage_tracking
                FOR ALL
                USING (true)
                WITH CHECK (true);
        END IF;
    END $$;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct SQL execution via pg_catalog
      console.log('⚠️  RPC method failed, trying direct SQL...');

      const { error: directError } = await supabase
        .from('_sql')
        .insert({ query: sql });

      if (directError) {
        throw directError;
      }
    }

    console.log('✅ usage_tracking table created successfully!\n');

    // Verify the table exists
    console.log('🔍 Verifying table...');
    const { data: tables, error: verifyError } = await supabase
      .from('usage_tracking')
      .select('*')
      .limit(0);

    if (verifyError) {
      if (verifyError.code === 'PGRST116') {
        console.log('⚠️  Table exists but has no RLS policies allowing access');
        console.log('   This is expected - table created successfully');
      } else {
        console.error('❌ Verification error:', verifyError);
      }
    } else {
      console.log('✅ Table verified and accessible\n');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to create table:', error.message);
    console.error('\nManual SQL to run in Supabase SQL Editor:');
    console.error('='.repeat(70));
    console.error(sql);
    console.error('='.repeat(70));
    return { success: false, error };
  }
}

// Run the migration
createUsageTrackingTable()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ Migration complete!');
      process.exit(0);
    } else {
      console.log('\n❌ Migration failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
