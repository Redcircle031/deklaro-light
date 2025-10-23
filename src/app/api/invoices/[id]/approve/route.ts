/**
 * POST /api/invoices/[id]/approve
 *
 * Approve invoice data after review.
 * Marks invoice as verified and locks further edits.
 *
 * @see specs/002-ocr-pipeline/contracts/invoice-review.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TENANT_HEADER = 'x-tenant-id';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    // Get tenant ID from header
    const tenantId = request.headers.get(TENANT_HEADER);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, tenant_id, reviewed_at, approved_at, status')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or not accessible' },
        { status: 404 }
      );
    }

    // Check if invoice has been reviewed
    if (!invoice.reviewed_at) {
      return NextResponse.json(
        { error: 'Invoice must be reviewed before approval' },
        { status: 400 }
      );
    }

    // Check if already approved
    if (invoice.approved_at) {
      return NextResponse.json(
        { error: 'Invoice already approved' },
        { status: 409 }
      );
    }

    // Approve invoice
    const approvedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        approved_at: approvedAt,
        status: 'VERIFIED',
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[Invoice Approve] Failed to approve invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve invoice' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoice_id: invoiceId,
      approved_at: approvedAt,
      approved_by: user.id,
      status: 'VERIFIED',
    });
  } catch (error) {
    console.error('[Invoice Approve] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
