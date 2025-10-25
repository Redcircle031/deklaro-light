require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function monitorLatestInvoice() {
  console.log('\n🔍 MONITORING LATEST INVOICE...\n');

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.log('❌ Error:', error);
    return;
  }

  if (!invoices || invoices.length === 0) {
    console.log('❌ No invoices found');
    return;
  }

  const invoice = invoices[0];

  console.log('📄 LATEST INVOICE:');
  console.log('─'.repeat(60));
  console.log(`ID:              ${invoice.id}`);
  console.log(`File:            ${invoice.file_name}`);
  console.log(`Status:          ${invoice.status}`);
  console.log(`Created:         ${invoice.created_at}`);
  console.log('');
  console.log('📊 EXTRACTED DATA:');
  console.log('─'.repeat(60));
  console.log(`Invoice Number:  ${invoice.invoiceNumber || '❌ NULL'}`);
  console.log(`Invoice Date:    ${invoice.invoiceDate || '❌ NULL'}`);
  console.log(`Net Amount:      ${invoice.netAmount || '❌ NULL'}`);
  console.log(`VAT Amount:      ${invoice.vatAmount || '❌ NULL'}`);
  console.log(`Gross Amount:    ${invoice.grossAmount || '❌ NULL'}`);
  console.log(`Currency:        ${invoice.currency}`);
  console.log(`OCR Confidence:  ${invoice.ocrConfidence ? (invoice.ocrConfidence * 100).toFixed(1) + '%' : '❌ NULL'}`);
  console.log(`Company ID:      ${invoice.company_id || '❌ NULL'}`);
  console.log('');

  if (invoice.extractedData) {
    console.log('✅ EXTRACTED DATA JSON:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(invoice.extractedData, null, 2));
  } else {
    console.log('❌ No extractedData JSON');
  }

  console.log('\n' + '─'.repeat(60));

  // Status check
  if (invoice.status === 'PROCESSED' && invoice.invoiceNumber) {
    console.log('✅ SUCCESS! Invoice fully processed with extracted data!');
  } else if (invoice.status === 'UPLOADED') {
    console.log('⚠️  WAITING: Invoice uploaded but not yet processed');
  } else {
    console.log('❌ FAILED: Invoice processed but missing data');
  }

  console.log('');
}

// Run immediately
monitorLatestInvoice();

// Then monitor every 3 seconds for 30 seconds
let count = 0;
const interval = setInterval(() => {
  count++;
  if (count > 10) {
    clearInterval(interval);
    console.log('\n✋ Monitoring stopped after 30 seconds\n');
    process.exit(0);
  }
  console.log(`\n🔄 Refreshing... (${count * 3}s)`);
  monitorLatestInvoice();
}, 3000);
