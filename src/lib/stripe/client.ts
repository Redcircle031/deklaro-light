/**
 * Stripe Client
 *
 * Server-side Stripe client for handling payments and subscriptions.
 */

import Stripe from 'stripe';

// Initialize Stripe client (lazy initialization to avoid build-time errors)
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    stripeClient = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }

  return stripeClient;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Subscription tier pricing
 */
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: 'Starter',
    price: 0,
    priceId: null, // Free tier
    features: [
      '50 invoices per month',
      'Basic OCR',
      '1 user',
      'Email support',
    ],
    limits: {
      invoices: 50,
      storage: 500, // MB
      users: 1,
    },
  },
  PRO: {
    name: 'Pro',
    price: 99, // PLN per month
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    features: [
      '500 invoices per month',
      'Advanced OCR with AI',
      'Up to 5 users',
      'KSeF integration',
      'Priority support',
    ],
    limits: {
      invoices: 500,
      storage: 5000, // MB
      users: 5,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299, // PLN per month
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    features: [
      'Unlimited invoices',
      'Advanced OCR with AI',
      'Unlimited users',
      'KSeF integration',
      'Custom integrations',
      'Dedicated support',
    ],
    limits: {
      invoices: -1, // Unlimited
      storage: -1, // Unlimited
      users: -1, // Unlimited
    },
  },
} as const;

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer: params.customerId,
    metadata: {
      tenantId: params.tenantId,
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  });

  return session;
}

/**
 * Create a customer portal session
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session;
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[Stripe] Failed to retrieve subscription:', error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  const stripe = getStripeClient();

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('[Stripe] Failed to cancel subscription:', error);
    return false;
  }
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  const stripe = getStripeClient();

  try {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    return customers.data[0] || null;
  } catch (error) {
    console.error('[Stripe] Failed to get customer:', error);
    return null;
  }
}

/**
 * Create customer
 */
export async function createCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });

  return customer;
}
