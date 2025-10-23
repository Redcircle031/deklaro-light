import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { TENANT_HEADER } from '@/lib/tenant/constants';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get(TENANT_HEADER);

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortByParam = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Map camelCase column names to snake_case database columns
    const columnMap: Record<string, string> = {
      'createdAt': 'created_at',
      'invoiceNumber': 'invoice_number',
      'invoiceDate': 'invoice_date',
      'grossAmount': 'gross_amount',
      'ocrConfidence': 'ocr_confidence',
    };
    const sortBy = columnMap[sortByParam] || sortByParam;

    const supabase = await createServerSupabaseClient();

    // Query invoices from public.invoices view
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
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    if (error) {
      console.error('[/api/invoices] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Map to response format
    const mapped = (invoices || []).map((invoice) => ({
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

    return NextResponse.json({ invoices: mapped });
  } catch (error) {
    console.error('[/api/invoices] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
