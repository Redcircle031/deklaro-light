require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('\n========================================');
  console.log('ULTRA HARD DATABASE ANALYSIS');
  console.log('========================================\n');

  // 1. Check invoices table
  console.log('1. CHECKING INVOICES TABLE:');
  console.log('-------------------------------------------');
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (invError) {
    console.log('❌ ERROR fetching invoices:', invError);
  } else {
    console.log(`✅ Found ${invoices.length} invoices`);
    invoices.forEach((inv, i) => {
      console.log(`\n  Invoice #${i + 1}:`);
      console.log(`    ID: ${inv.id}`);
      console.log(`    File: ${inv.file_name}`);
      console.log(`    Invoice #: ${inv.invoice_number || '❌ NULL'}`);
      console.log(`    Status: ${inv.status}`);
      console.log(`    Company ID: ${inv.company_id || '❌ NULL'}`);
      console.log(`    Gross Amount: ${inv.gross_amount || '❌ NULL'}`);
      console.log(`    Extracted Data: ${inv.extracted_data ? '✅ EXISTS' : '❌ NULL'}`);
      if (inv.extracted_data) {
        console.log(`    Extracted Data Preview:`, JSON.stringify(inv.extracted_data).substring(0, 200));
      }
    });
  }

  // 2. Check companies table
  console.log('\n\n2. CHECKING COMPANIES TABLE:');
  console.log('-------------------------------------------');
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('*')
    .limit(10);

  if (compError) {
    console.log('❌ ERROR fetching companies:', compError);
  } else {
    console.log(`✅ Found ${companies.length} companies`);
    companies.forEach((comp, i) => {
      console.log(`\n  Company #${i + 1}:`);
      console.log(`    ID: ${comp.id}`);
      console.log(`    Name: ${comp.name}`);
      console.log(`    NIP: ${comp.nip}`);
      console.log(`    Tenant ID: ${comp.tenant_id}`);
    });
  }

  // 3. Check tenants table
  console.log('\n\n3. CHECKING TENANTS TABLE:');
  console.log('-------------------------------------------');
  const { data: tenants, error: tenError } = await supabase
    .from('tenants')
    .select('*');

  if (tenError) {
    console.log('❌ ERROR fetching tenants:', tenError);
  } else {
    console.log(`✅ Found ${tenants.length} tenants`);
    tenants.forEach((tenant, i) => {
      console.log(`\n  Tenant #${i + 1}:`);
      console.log(`    ID: ${tenant.id}`);
      console.log(`    Name: ${tenant.name}`);
      console.log(`    Slug: ${tenant.slug}`);
    });
  }

  // 4. Check if invoices have matching companies
  console.log('\n\n4. CHECKING INVOICE-COMPANY RELATIONSHIPS:');
  console.log('-------------------------------------------');
  if (invoices && invoices.length > 0) {
    for (const inv of invoices.slice(0, 3)) {
      if (inv.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', inv.company_id)
          .single();

        console.log(`\n  Invoice ${inv.file_name}:`);
        console.log(`    Company ID: ${inv.company_id}`);
        console.log(`    Company Found: ${company ? '✅ ' + company.name : '❌ NOT FOUND'}`);
      } else {
        console.log(`\n  Invoice ${inv.file_name}:`);
        console.log(`    ❌ No company_id set!`);
      }
    }
  }

  console.log('\n========================================');
  console.log('END OF ANALYSIS');
  console.log('========================================\n');
}

checkDatabase().catch(console.error);
