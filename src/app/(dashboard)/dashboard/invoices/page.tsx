import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { InvoiceUpload } from '@/components/invoices/InvoiceUpload';
import { InvoiceTableEnhanced } from '@/components/invoices/InvoiceTableEnhanced';
import { TENANT_COOKIE } from '@/lib/tenant/constants';

export const metadata = {
  title: 'Invoices | Deklaro',
  description: 'Manage your invoices with AI-powered OCR and KSeF integration',
};

// Demo data for when database is unavailable
const getDemoInvoices = () => [
  {
    id: '1',
    fileName: 'invoice-2024-01.pdf',
    invoiceNumber: 'INV-2024-001',
    issueDate: new Date('2024-01-15').toISOString(),
    company: { name: 'Acme Corp', nip: '1234567890' },
    totalAmount: 1250.50,
    currency: 'PLN',
    status: 'PROCESSED',
    invoiceType: 'PURCHASE',
    ocrConfidence: 0.95,
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: '2',
    fileName: 'invoice-2024-02.pdf',
    invoiceNumber: 'INV-2024-002',
    issueDate: new Date('2024-01-20').toISOString(),
    company: { name: 'Tech Solutions Ltd', nip: '9876543210' },
    totalAmount: 3420.00,
    currency: 'PLN',
    status: 'PENDING',
    invoiceType: 'SALE',
    ocrConfidence: 0.88,
    createdAt: new Date('2024-01-20').toISOString(),
  },
  {
    id: '3',
    fileName: 'invoice-2024-03.pdf',
    invoiceNumber: 'INV-2024-003',
    issueDate: new Date('2024-02-01').toISOString(),
    company: { name: 'Office Supplies Inc', nip: '5551234567' },
    totalAmount: 567.80,
    currency: 'PLN',
    status: 'PROCESSED',
    invoiceType: 'EXPENSE',
    ocrConfidence: 0.92,
    createdAt: new Date('2024-02-01').toISOString(),
  },
  {
    id: '4',
    fileName: 'invoice-2024-04.pdf',
    invoiceNumber: 'INV-2024-004',
    issueDate: new Date('2024-02-10').toISOString(),
    company: { name: 'Professional Services Group', nip: '7778889990' },
    totalAmount: 8900.00,
    currency: 'PLN',
    status: 'SUBMITTED',
    invoiceType: 'PURCHASE',
    ocrConfidence: 0.97,
    createdAt: new Date('2024-02-10').toISOString(),
  },
  {
    id: '5',
    fileName: 'invoice-2024-05.pdf',
    invoiceNumber: 'INV-2024-005',
    issueDate: new Date('2024-02-15').toISOString(),
    company: { name: 'Digital Marketing Co', nip: '4445556667' },
    totalAmount: 2150.00,
    currency: 'PLN',
    status: 'PROCESSING',
    invoiceType: 'SALE',
    ocrConfidence: 0.85,
    createdAt: new Date('2024-02-15').toISOString(),
  },
  {
    id: '6',
    fileName: 'invoice-2024-06.pdf',
    invoiceNumber: 'INV-2024-006',
    issueDate: new Date('2024-02-20').toISOString(),
    company: { name: 'Cloud Hosting Services', nip: '3334445556' },
    totalAmount: 450.00,
    currency: 'PLN',
    status: 'FAILED',
    invoiceType: 'EXPENSE',
    ocrConfidence: 0.72,
    createdAt: new Date('2024-02-20').toISOString(),
  },
];

async function getInvoices(tenantId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    // Query invoices from public.invoices view (which references tenant.invoices)
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        file_name,
        invoice_number,
        invoice_date,
        gross_amount,
        currency,
        status,
        invoice_type,
        ocr_confidence,
        created_at,
        companies!company_id (
          name,
          nip
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch invoices:', error);
      return getDemoInvoices();
    }

    console.log(`[getInvoices] Found ${invoices?.length || 0} invoices for tenant ${tenantId}`);

    return (invoices || []).map((invoice) => ({
      id: invoice.id,
      fileName: invoice.file_name,
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.invoice_date,
      company: invoice.companies
        ? {
            name: invoice.companies.name,
            nip: invoice.companies.nip,
          }
        : null,
      totalAmount: invoice.gross_amount,
      currency: invoice.currency,
      status: invoice.status,
      invoiceType: invoice.invoice_type,
      ocrConfidence: invoice.ocr_confidence,
      createdAt: invoice.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    // Return demo data in case of database error
    return getDemoInvoices();
  }
}

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get(TENANT_COOKIE)?.value || 'demo-tenant-1';

  const invoices = await getInvoices(tenantId);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Upload, process, and manage your invoices with AI-powered OCR
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Invoices</h2>
        <InvoiceUpload />
      </div>

      {/* Invoice Table */}
      <div className="flex-1 rounded-lg border bg-card p-6">
        <InvoiceTableEnhanced initialInvoices={invoices} />
      </div>
    </div>
  );
}
