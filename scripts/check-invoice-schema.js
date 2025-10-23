// Check invoice table schema
import { createClient } from '@supabase/supabase-js';

// Hardcode for testing
const supabaseUrl = 'https://deljxsvywkbewwsdawqj.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg3NjcwMSwiZXhwIjoyMDc1NDUyNzAxfQ.OSeH9K86XQ8LtAFFJDW6H1Ed0KOFNb-Gs7L7NWIzM-Q';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkSchema() {
  console.log('🔍 Checking invoice table schema...\n');

  // Try to select from invoices with limit 0 to get column names
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .limit(0);

  if (error) {
    console.error('❌ Error querying invoices table:', error);
    return;
  }

  console.log('✅ Successfully queried invoices table');
  console.log('📊 Table exists and is accessible\n');

  // Try inserting a test record to see what columns are accepted
  console.log('🧪 Attempting test insert with snake_case columns...');
  const testInsert = await supabase
    .from('invoices')
    .insert({
      tenant_id: 'test-tenant',
      original_file_url: 'test.pdf',
      file_name: 'test.pdf',
      file_size: 1000,
      uploaded_by: 'test-user',
      status: 'UPLOADED',
      currency: 'PLN',
    })
    .select()
    .single();

  if (testInsert.error) {
    console.error('❌ Insert failed:', testInsert.error);
    console.log('\n💡 This tells us which columns are wrong');
  } else {
    console.log('✅ Insert succeeded!');
    console.log('📝 Inserted record:', testInsert.data);

    // Clean up test record
    await supabase.from('invoices').delete().eq('id', testInsert.data.id);
    console.log('🧹 Cleaned up test record');
  }
}

checkSchema().catch(console.error);
