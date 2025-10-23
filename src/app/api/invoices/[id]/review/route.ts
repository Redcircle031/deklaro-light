/**
 * POST /api/invoices/[id]/review
 *
 * Submit manual corrections to OCR-extracted invoice data.
 * Tracks corrections for ML improvement without auto-approving.
 *
 * @see specs/002-ocr-pipeline/contracts/invoice-review.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReviewInvoiceRequestSchema } from '@/lib/ai/schemas/invoice-schema';

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

    // Parse and validate request body
    const body = await request.json();
    const validation = ReviewInvoiceRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { corrections, notes } = validation.data;

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

    // Fetch invoice with current extracted data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, tenant_id, extracted_data, confidence_scores, approved_at')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or not accessible' },
        { status: 404 }
      );
    }

    // Check if invoice is already approved
    if (invoice.approved_at) {
      return NextResponse.json(
        { error: 'Cannot edit approved invoice' },
        { status: 409 }
      );
    }

    // Apply corrections to extracted_data
    const currentData = invoice.extracted_data || {};
    const updatedData = { ...currentData };

    for (const correction of corrections) {
      const { field_name, corrected_value, original_value } = correction;

      // Parse field path (e.g., "seller.nip" -> ["seller", "nip"])
      const fieldPath = field_name.split('.');

      // Apply correction (simple path traversal)
      if (fieldPath.length === 1) {
        updatedData[fieldPath[0]] = corrected_value;
      } else if (fieldPath.length === 2) {
        if (!updatedData[fieldPath[0]]) {
          updatedData[fieldPath[0]] = {};
        }
        updatedData[fieldPath[0]][fieldPath[1]] = corrected_value;
      }

      // Get original confidence for this field
      const confidenceScores = invoice.confidence_scores || {};
      const originalConfidence = getFieldConfidence(confidenceScores, field_name);

      // Create correction history record
      await supabase.from('correction_history').insert({
        tenant_id: tenantId,
        invoice_id: invoiceId,
        field_name,
        original_value: original_value !== undefined ? String(original_value) : null,
        corrected_value: String(corrected_value),
        original_confidence: originalConfidence,
        corrected_by: user.id,
      });
    }

    // Update invoice with corrected data
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        extracted_data: updatedData,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[Invoice Review] Failed to update invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to save corrections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoice_id: invoiceId,
      corrections_applied: corrections.length,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_data: updatedData,
    });
  } catch (error) {
    console.error('[Invoice Review] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get confidence score for a specific field
 */
function getFieldConfidence(
  confidenceScores: any,
  fieldName: string
): number | null {
  const fieldMap: Record<string, string> = {
    'invoice_number': 'invoice_number',
    'issue_date': 'issue_date',
    'due_date': 'due_date',
    'seller.name': 'seller_name',
    'seller.nip': 'seller_nip',
    'seller.address': 'seller_name', // Use name confidence as proxy
    'buyer.name': 'buyer_name',
    'buyer.nip': 'buyer_nip',
    'buyer.address': 'buyer_name', // Use name confidence as proxy
    'currency': 'gross_amount', // Use amount confidence as proxy
    'net_amount': 'net_amount',
    'vat_amount': 'vat_amount',
    'gross_amount': 'gross_amount',
  };

  const mappedField = fieldMap[fieldName];
  return mappedField && confidenceScores[mappedField]
    ? confidenceScores[mappedField]
    : null;
}
