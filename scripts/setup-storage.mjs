/**
 * Create Supabase Storage Bucket for Invoices
 * Run with: node scripts/setup-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n🪣 Creating Storage Bucket for Invoices...\n');

// Create bucket
const { data: bucket, error: createError } = await supabase.storage.createBucket('invoices', {
  public: false,
  fileSizeLimit: 52428800, // 50MB
  allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
});

if (createError) {
  if (createError.message.includes('already exists')) {
    console.log('⚠️  Bucket "invoices" already exists');
  } else {
    console.error('❌ Error creating bucket:', createError);
    process.exit(1);
  }
} else {
  console.log('✅ Bucket "invoices" created successfully!');
}

// Verify bucket
const { data: buckets } = await supabase.storage.listBuckets();
const invoicesBucket = buckets.find(b => b.name === 'invoices');

if (invoicesBucket) {
  console.log('\n✅ Bucket verified!');
  console.log('📊 Details:');
  console.log(`   - Name: ${invoicesBucket.name}`);
  console.log(`   - Public: ${invoicesBucket.public}`);
  console.log(`   - Max size: ${(invoicesBucket.file_size_limit / 1024 / 1024).toFixed(0)}MB`);
  console.log(`   - Allowed types: ${invoicesBucket.allowed_mime_types?.join(', ') || 'PDF, images'}`);
}

console.log('\n✅ Storage bucket ready!');
console.log('\n📝 Next: Create RLS policies in Supabase Dashboard SQL Editor:\n');
console.log('-- Allow authenticated users to upload invoices');
console.log(`CREATE POLICY "Users can upload invoices"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices');

-- Allow users to read invoices
CREATE POLICY "Users can read invoices"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoices');

-- Allow users to delete invoices
CREATE POLICY "Users can delete invoices"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoices');`);
console.log('\n');
