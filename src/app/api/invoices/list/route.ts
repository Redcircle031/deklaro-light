import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { TENANT_COOKIE } from '@/lib/tenant/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from cookie
    const cookieStore = await cookies();
    const tenantId = cookieStore.get(TENANT_COOKIE)?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant ID found' },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    console.log('[Invoice List API] Fetching invoices for tenant:', tenantId);

    // Query invoices from tenant.invoices
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        fileName:file_name,
        invoiceNumber:invoice_number,
        issueDate:invoice_date,
        grossAmount:gross_amount,
        currency,
        status,
        invoiceType:invoice_type,
        ocrConfidence:ocr_confidence,
        createdAt:created_at,
        company:companies!company_id (
          name,
          nip
        )
      `)
      .eq('tenantId', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Invoice List API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices', details: error.message },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedInvoices = (invoices || []).map((invoice: any) => ({
      id: invoice.id,
      fileName: invoice.fileName,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      company: invoice.company
        ? {
            name: invoice.company.name,
            nip: invoice.company.nip,
          }
        : null,
      totalAmount: invoice.grossAmount,
      currency: invoice.currency,
      status: invoice.status,
      invoiceType: invoice.invoiceType,
      ocrConfidence: invoice.ocrConfidence,
      createdAt: invoice.createdAt,
    }));

    console.log('[Invoice List API] Found', transformedInvoices.length, 'invoices');

    return NextResponse.json(
      {
        success: true,
        invoices: transformedInvoices,
        count: transformedInvoices.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[Invoice List API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
