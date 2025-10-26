require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInvoiceFields() {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (invoices && invoices.length > 0) {
    console.log('Latest invoice fields:');
    console.log(JSON.stringify(invoices[0], null, 2));
  }
}

checkInvoiceFields();
