/**
 * Test Invoice Upload Script
 * Uploads a test invoice and monitors the complete OCR → Email flow
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://deljxsvywkbewwsdawqj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts';

async function main() {
  console.log('🚀 Starting invoice upload test...\n');

  // Step 1: Authenticate
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@deklaro.com',
    password: 'Test123456789',
  });

  if (authError || !authData.user) {
    console.error('❌ Authentication failed:', authError);
    process.exit(1);
  }

  console.log('✅ Authenticated as:', authData.user.email);

  // Step 2: Get tenant ID
  const { data: memberData, error: memberError } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', authData.user.id)
    .limit(1)
    .single();

  if (memberError || !memberData) {
    console.error('❌ Failed to get tenant ID:', memberError);
    process.exit(1);
  }

  const tenantId = memberData.tenant_id;
  const accessToken = authData.session.access_token;

  console.log('✅ Tenant ID:', tenantId);
  console.log('');

  // Step 3: Upload invoice
  const form = new FormData();
  form.append('files', fs.createReadStream('tests/fixtures/test-invoice.jpg'));

  console.log('📤 Uploading invoice...');

  // Create cookies from session
  const cookies = [
    `sb-deljxsvywkbewwsdawqj-auth-token=${JSON.stringify({
      access_token: accessToken,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
      expires_at: authData.session.expires_at,
      token_type: 'bearer',
      user: authData.user,
    })}`,
    `x-deklaro-tenant=${tenantId}`,
  ].join('; ');

  const uploadResponse = await fetch('http://localhost:4000/api/invoices/upload', {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'x-deklaro-tenant-id': tenantId,
    },
    body: form,
  });

  const uploadResult = await uploadResponse.json();

  if (!uploadResponse.ok) {
    console.error('❌ Upload failed:', uploadResult);
    process.exit(1);
  }

  console.log('✅ Upload successful!');
  console.log('');
  console.log('📊 Results:', JSON.stringify(uploadResult, null, 2));
  console.log('');

  // Extract invoice ID
  const invoiceId = uploadResult.results?.[0]?.invoiceId;

  if (!invoiceId) {
    console.error('❌ No invoice ID returned');
    process.exit(1);
  }

  console.log('🎯 Invoice ID:', invoiceId);
  console.log('');
  console.log('⏳ Waiting 30 seconds for OCR processing...');
  console.log('   (Check Inngest UI at http://localhost:7777 to monitor)');
  console.log('');

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Step 4: Check invoice status
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    console.error('❌ Failed to fetch invoice:', invoiceError);
    process.exit(1);
  }

  console.log('📋 Final Invoice Status:', invoice.status);
  console.log('📋 Overall Confidence:', invoice.overall_confidence);
  console.log('');

  if (invoice.status === 'EXTRACTED' || invoice.status === 'NEEDS_REVIEW') {
    console.log('✅ OCR PROCESSING COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('Extracted Data:');
    console.log(JSON.stringify(invoice.extracted_data, null, 2));
  } else if (invoice.status === 'FAILED') {
    console.log('❌ OCR PROCESSING FAILED');
  } else {
    console.log('⏳ Still processing... status:', invoice.status);
  }

  console.log('');
  console.log('✅ Test completed!');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
