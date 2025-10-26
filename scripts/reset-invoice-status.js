require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetInvoice() {
  const invoiceId = '5e0d884f-4e15-49cb-8227-c1c684615dbc';

  console.log(`🔄 Resetting invoice ${invoiceId} to UPLOADED status...`);

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'UPLOADED',
      invoice_number: null,
      invoice_date: null,
      net_amount: null,
      vat_amount: null,
      gross_amount: null,
      extracted_data: null,
      ocr_confidence: null,
      ocr_processed_at: null
    })
    .eq('id', invoiceId);

  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Invoice reset to UPLOADED status');
  }
}

resetInvoice();
