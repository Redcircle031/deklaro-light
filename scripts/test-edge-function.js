require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEdgeFunction() {
  console.log('\n🧪 TESTING EDGE FUNCTION...\n');

  // Get the latest UPLOADED invoice
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'UPLOADED')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError || !invoices || invoices.length === 0) {
    console.log('❌ No UPLOADED invoices found');
    return;
  }

  const invoice = invoices[0];
  console.log(`📄 Testing with invoice: ${invoice.id}`);
  console.log(`   File: ${invoice.file_name}`);
  console.log(`   Original URL: ${invoice.original_file_url}`); // snake_case from database
  console.log('');

  // Call the Edge Function
  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-invoice`;
  console.log(`📞 Calling Edge Function: ${edgeFunctionUrl}`);

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      invoiceId: invoice.id,
      filePath: invoice.original_file_url, // snake_case from database
    }),
  });

  console.log(`📊 Response status: ${response.status}`);

  const result = await response.json();
  console.log('📦 Response body:');
  console.log(JSON.stringify(result, null, 2));

  if (response.ok) {
    console.log('\n✅ Edge Function called successfully!');
    console.log('⏳ Waiting 5 seconds for processing...\n');

    // Wait and check database
    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice.id)
      .single();

    console.log('📄 UPDATED INVOICE:');
    console.log('─'.repeat(60));
    console.log(`Status:          ${updatedInvoice.status}`);
    console.log(`Invoice Number:  ${updatedInvoice.invoiceNumber || '❌ NULL'}`);
    console.log(`Gross Amount:    ${updatedInvoice.grossAmount || '❌ NULL'}`);
    console.log(`OCR Confidence:  ${updatedInvoice.ocrConfidence ? (updatedInvoice.ocrConfidence * 100).toFixed(1) + '%' : '❌ NULL'}`);

    if (updatedInvoice.extractedData) {
      console.log('\n✅ EXTRACTED DATA:');
      console.log(JSON.stringify(updatedInvoice.extractedData, null, 2));
    }
  } else {
    console.log('\n❌ Edge Function call failed!');
  }
}

testEdgeFunction().catch(console.error);
