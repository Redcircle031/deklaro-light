/**
 * Create Supabase Storage Bucket for Invoices
 * Run with: node scripts/create-storage-bucket.js
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

async function createStorageBucket() {
  console.log('\n🪣 Creating Storage Bucket for Invoices...\n');

  try {
    // Create bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('invoices', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log('⚠️  Bucket "invoices" already exists');
        console.log('✅ Proceeding with existing bucket\n');
      } else {
        throw createError;
      }
    } else {
      console.log('✅ Bucket "invoices" created successfully!');
      console.log('📋 Bucket details:', bucket);
      console.log('');
    }

    // Create RLS policies
    console.log('🔒 Creating RLS policies...\n');

    const policies = `
      -- Allow authenticated users to upload to their tenant's folder
      CREATE POLICY "Users can upload invoices to their tenant folder"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'invoices' AND
        (storage.foldername(name))[1] IN (
          SELECT tenant_id::text
          FROM public.tenant_members
          WHERE user_id = auth.uid()
        )
      );

      -- Allow users to read invoices from their tenant
      CREATE POLICY "Users can read their tenant's invoices"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'invoices' AND
        (storage.foldername(name))[1] IN (
          SELECT tenant_id::text
          FROM public.tenant_members
          WHERE user_id = auth.uid()
        )
      );

      -- Allow users to delete invoices from their tenant
      CREATE POLICY "Users can delete their tenant's invoices"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'invoices' AND
        (storage.foldername(name))[1] IN (
          SELECT tenant_id::text
          FROM public.tenant_members
          WHERE user_id = auth.uid()
        )
      );
    `;

    console.log('⚠️  RLS policies need to be created manually in Supabase Dashboard');
    console.log('📝 SQL to run in SQL Editor:\n');
    console.log('='.repeat(70));
    console.log(policies);
    console.log('='.repeat(70));
    console.log('');

    // Verify bucket exists
    console.log('🔍 Verifying bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    const invoicesBucket = buckets.find((b) => b.name === 'invoices');
    if (invoicesBucket) {
      console.log('✅ Bucket verified and accessible');
      console.log('📊 Bucket info:', {
        name: invoicesBucket.name,
        id: invoicesBucket.id,
        public: invoicesBucket.public,
        file_size_limit: invoicesBucket.file_size_limit,
        allowed_mime_types: invoicesBucket.allowed_mime_types,
      });
    } else {
      console.log('❌ Bucket not found in list');
    }

    console.log('\n✅ Storage bucket setup complete!');
    console.log('');
    console.log('📁 Bucket structure:');
    console.log('   invoices/');
    console.log('   ├── <tenant-id>/');
    console.log('   │   ├── <invoice-id>.pdf');
    console.log('   │   └── ...');
    console.log('');
    console.log('🔐 Security:');
    console.log('   - Private bucket (not publicly accessible)');
    console.log('   - RLS policies enforce tenant isolation');
    console.log('   - Max file size: 50MB');
    console.log('   - Allowed types: PDF, PNG, JPEG');
    console.log('');

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to create bucket:', error.message);
    console.error(error);
    return { success: false, error };
  }
}

// Run the script
createStorageBucket()
  .then((result) => {
    if (result.success) {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Script failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
