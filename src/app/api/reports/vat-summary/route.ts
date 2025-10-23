import { NextRequest, NextResponse } from 'next/server';
import { generateVATSummaryReport, getDateRange } from '@/lib/reports/report-builder';
import { TENANT_HEADER } from '@/lib/tenant/constants';

/**
 * GET /api/reports/vat-summary?period=month&startDate=2024-01-01&endDate=2024-01-31
 * Generate VAT summary report
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get(TENANT_HEADER);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let dateRange;
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr),
        endDate: new Date(endDateStr),
      };
    } else {
      dateRange = getDateRange(period as 'today' | 'week' | 'month' | 'quarter' | 'year');
    }

    const report = await generateVATSummaryReport(tenantId, dateRange);

    return NextResponse.json(report);
  } catch (error) {
    console.error('VAT summary report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate VAT summary report' },
      { status: 500 }
    );
  }
}
