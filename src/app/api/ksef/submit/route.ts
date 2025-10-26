/**
 * KSeF Submission API Endpoint
 * Submits invoices to the Polish National e-Invoice System
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { submitInvoiceToKSeF } from '@/lib/ksef/submission-service';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit/logger';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const prisma = new PrismaClient();

async function ksefSubmitHandler(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from headers
    const tenantId = request.headers.get('x-deklaro-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context not found' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 404 }
      );
    }

    // Get tenant NIP (would come from tenant settings in production)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // TODO: Get actual tenant NIP from tenant settings
    const tenantNip = '0000000000'; // Placeholder

    // Submit to KSeF
    const result = await submitInvoiceToKSeF(invoiceId, tenantNip);

    if (result.success) {
      // Log audit trail
      createAuditLog({
        tenantId,
        userId: user.id,
        action: 'SUBMIT',
        entityType: 'KSEF_SUBMISSION',
        entityId: invoiceId,
        metadata: {
          ksefNumber: result.ksefNumber,
        },
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
      }).catch((err) => {
        console.error('[KSeF API] Failed to create audit log:', err);
      });

      return NextResponse.json({
        success: true,
        message: 'Invoice submitted to KSeF successfully',
        ksefNumber: result.ksefNumber,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Submission failed',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[KSeF API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 100 requests per minute per tenant (use API preset)
export const POST = withRateLimit(
  ksefSubmitHandler,
  RATE_LIMITS.API,
  'ksef-submit'
);
