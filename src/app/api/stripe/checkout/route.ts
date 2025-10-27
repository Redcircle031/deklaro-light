/**
 * Stripe Checkout API
 *
 * Creates a checkout session for subscription upgrade.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe/client';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const CheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
});

async function checkoutHandler(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment system is not configured' },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID
    const tenantId = request.headers.get('x-deklaro-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Parse request
    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { priceId } = validation.data;

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';

    // Create checkout session
    const session = await createCheckoutSession({
      tenantId,
      priceId,
      successUrl: `${baseUrl}/dashboard?upgrade=success`,
      cancelUrl: `${baseUrl}/dashboard?upgrade=cancelled`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(
  checkoutHandler,
  RATE_LIMITS.API,
  'stripe-checkout'
);
