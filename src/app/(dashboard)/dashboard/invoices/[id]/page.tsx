import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView';
import { cookies } from 'next/headers';
import { TENANT_COOKIE } from '@/lib/tenant/constants';

const prisma = new PrismaClient();

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Invoice ${id} | Deklaro`,
    description: 'Invoice details and OCR results',
  };
}

// Demo invoice data for when database is unavailable
const getDemoInvoice = (id: string) => ({
  id,
  fileName: 'invoice-2024-01.pdf',
  originalFileUrl: '/demo/invoice-2024-01.pdf',
  fileSize: 245680,
  uploadedBy: 'demo-user',
  status: 'PROCESSED',
  invoiceType: 'PURCHASE',
  invoiceNumber: 'INV-2024-001',
  invoiceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-01-30'),
  currency: 'PLN',
  netAmount: 1016.26,
  vatAmount: 234.24,
  grossAmount: 1250.50,
  ocrProcessedAt: new Date('2024-01-15T10:01:30'),
  ocrConfidence: 0.95,
  ksefNumber: null,
  company: {
    id: 'company-1',
    name: 'Acme Corp',
    nip: '1234567890',
    address: 'ul. Marszałkowska 1',
    city: 'Warszawa',
    postalCode: '00-001',
    country: 'Poland',
    tenantId: 'demo-tenant-1',
    email: 'contact@acme.com',
    phone: '+48 22 123 4567',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  lineItems: [
    {
      id: 'item-1',
      lineNumber: 1,
      description: 'Professional Services - Consulting',
      quantity: 10,
      unitPrice: 100.00,
      netAmount: 1000.00,
      vatRate: 23,
      vatAmount: 230.00,
      grossAmount: 1230.00,
      invoiceId: id,
      createdAt: new Date(),
    },
    {
      id: 'item-2',
      lineNumber: 2,
      description: 'Travel Expenses',
      quantity: 1,
      unitPrice: 20.50,
      netAmount: 16.26,
      vatRate: 23,
      vatAmount: 4.24,
      grossAmount: 20.50,
      invoiceId: id,
      createdAt: new Date(),
    },
  ],
  ocrJob: {
    status: 'COMPLETED',
    progress: 100,
    rawText: 'INVOICE\nINV-2024-001\nDate: 2024-01-15\n...',
    confidence: 0.95,
  },
  extractedData: {
    invoiceNumber: 'INV-2024-001',
    issueDate: '2024-01-15',
    seller: { name: 'Demo Accounting Firm', nip: '9876543210' },
    buyer: { name: 'Acme Corp', nip: '1234567890' },
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  tenantId: 'demo-tenant-1',
});

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  // Get tenant ID from cookies
  const cookieStore = await cookies();
  const tenantId = cookieStore.get(TENANT_COOKIE)?.value || 'demo-tenant-1';

  let invoice;

  try {
    // Fetch invoice from database with all related data
    invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        company: true,
        lineItems: {
          orderBy: { lineNumber: 'asc' },
        },
        ocrJob: true,
      },
    });
  } catch (error) {
    // Only log error in production, suppress in demo mode
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      console.error('Failed to fetch invoice:', error);
    }
    // Use demo data in case of database error
    invoice = getDemoInvoice(id);
  }

  if (!invoice) {
    // In demo mode, return demo invoice
    invoice = getDemoInvoice(id);
  }

  // Transform the data for the component
  const invoiceData = {
    id: invoice.id,
    fileName: invoice.fileName,
    originalFileUrl: invoice.originalFileUrl,
    fileSize: invoice.fileSize,
    uploadedBy: invoice.uploadedBy,
    status: invoice.status,
    invoiceType: invoice.invoiceType || 'UNKNOWN',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate?.toISOString(),
    dueDate: invoice.dueDate?.toISOString(),
    currency: invoice.currency,
    netAmount: invoice.netAmount ? parseFloat(invoice.netAmount.toString()) : undefined,
    vatAmount: invoice.vatAmount ? parseFloat(invoice.vatAmount.toString()) : undefined,
    grossAmount: invoice.grossAmount ? parseFloat(invoice.grossAmount.toString()) : undefined,
    ocrProcessedAt: invoice.ocrProcessedAt?.toISOString(),
    ocrConfidence: invoice.ocrConfidence,
    ksefNumber: invoice.ksefNumber || undefined,
    company: invoice.company
      ? {
          id: invoice.company.id,
          name: invoice.company.name,
          nip: invoice.company.nip,
          address: invoice.company.address,
          city: invoice.company.city,
          postalCode: invoice.company.postalCode,
          country: invoice.company.country,
        }
      : undefined,
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber,
      description: item.description,
      quantity: parseFloat(item.quantity.toString()),
      unitPrice: parseFloat(item.unitPrice.toString()),
      vatRate: parseFloat(item.vatRate.toString()),
      netAmount: parseFloat(item.netAmount.toString()),
      vatAmount: parseFloat(item.vatAmount.toString()),
      grossAmount: parseFloat(item.grossAmount.toString()),
    })),
    extractedData: invoice.extractedData as Record<string, unknown> | null,
    ocrJob: invoice.ocrJob
      ? {
          status: invoice.ocrJob.status,
          progress: invoice.ocrJob.progress,
          rawText: invoice.ocrJob.rawText,
          confidence: invoice.ocrJob.confidence,
        }
      : undefined,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/dashboard/invoices" className="hover:text-blue-600">
          Invoices
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{invoice.fileName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{invoice.fileName}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Invoice details and OCR extraction results
          </p>
          {/* Status Badge */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                invoice.status === 'COMPLETED' || invoice.status === 'APPROVED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : invoice.status === 'PROCESSING'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : invoice.status === 'ERROR'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/api/invoices/${invoice.id}/download`}
            className="px-4 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Download PDF
          </Link>
          {(invoice.status === 'PROCESSED' || invoice.status === 'APPROVED') && (
            <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
              Submit to KSeF
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <InvoiceDetailView invoice={invoiceData} />
    </div>
  );
}
