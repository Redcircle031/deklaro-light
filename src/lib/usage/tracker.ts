/**
 * Usage Tracking and Subscription Limit Enforcement
 * Tracks invoice counts per tenant and enforces subscription limits
 */

import { createClient } from '@supabase/supabase-js';

// Create admin client for usage tracking (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type SubscriptionTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export const SUBSCRIPTION_LIMITS = {
  STARTER: {
    invoicesPerMonth: 100,
    maxUsers: 2,
  },
  PRO: {
    invoicesPerMonth: 500,
    maxUsers: 10,
  },
  ENTERPRISE: {
    invoicesPerMonth: Infinity,
    maxUsers: Infinity,
  },
} as const;

/**
 * Get current period key (YYYY-MM format)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get or create usage record for current period
 */
export async function getOrCreateUsageRecord(tenantId: string) {
  const period = getCurrentPeriod();

  // Try to get existing record
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('usage_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('period', period)
    .single();

  if (existing && !fetchError) {
    return existing;
  }

  // Create new usage record for this period
  const now = new Date().toISOString();
  const { data: newRecord, error: createError } = await supabaseAdmin
    .from('usage_records')
    .insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      period,
      invoice_count: 0,
      storage_bytes: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create usage record: ${createError.message}`);
  }

  return newRecord;
}

/**
 * Increment invoice count for tenant
 */
export async function incrementInvoiceCount(tenantId: string): Promise<void> {
  const period = getCurrentPeriod();

  // Try to increment existing record
  const { error: updateError } = await supabaseAdmin
    .from('usage_records')
    .update({ invoice_count: supabaseAdmin.rpc('increment', { x: 1 }) })
    .eq('tenant_id', tenantId)
    .eq('period', period);

  // If no rows updated, create new record
  if (updateError) {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('usage_records')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        period,
        invoice_count: 1,
        storage_bytes: 0,
        created_at: now,
        updated_at: now,
      });
  }
}

/**
 * Increment storage usage for tenant
 */
export async function incrementStorageUsage(
  tenantId: string,
  bytes: number
): Promise<void> {
  const period = getCurrentPeriod();

  // Get current usage
  const existing = await getOrCreateUsageRecord(tenantId);

  // Update storage bytes
  await supabaseAdmin
    .from('usage_records')
    .update({ storage_bytes: (existing.storage_bytes || 0) + bytes })
    .eq('tenant_id', tenantId)
    .eq('period', period);
}

/**
 * Check if tenant has reached their invoice limit
 */
export async function checkInvoiceLimit(
  tenantId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Get tenant subscription tier
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('subscription')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    throw new Error('Tenant not found');
  }

  const tier = (tenant.subscription || 'STARTER') as SubscriptionTier;
  const limit = SUBSCRIPTION_LIMITS[tier].invoicesPerMonth;

  // Get current usage
  const usage = await getOrCreateUsageRecord(tenantId);
  const current = usage.invoice_count || 0;

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

/**
 * Check if tenant can add more users
 */
export async function checkUserLimit(
  tenantId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Get tenant subscription tier
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('subscription')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new Error('Tenant not found');
  }

  // Count tenant members
  const { count, error: countError } = await supabaseAdmin
    .from('tenant_members')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (countError) {
    throw new Error(`Failed to count users: ${countError.message}`);
  }

  const tier = (tenant.subscription || 'STARTER') as SubscriptionTier;
  const limit = SUBSCRIPTION_LIMITS[tier].maxUsers;
  const current = count || 0;

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

/**
 * Get usage statistics for tenant
 */
export async function getUsageStats(tenantId: string) {
  // Get tenant info
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('subscription')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new Error('Tenant not found');
  }

  // Count users
  const { count: userCount } = await supabaseAdmin
    .from('tenant_members')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const currentUsage = await getOrCreateUsageRecord(tenantId);
  const tier = (tenant.subscription || 'STARTER') as SubscriptionTier;
  const limits = SUBSCRIPTION_LIMITS[tier];

  return {
    tier,
    invoices: {
      current: currentUsage.invoice_count || 0,
      limit: limits.invoicesPerMonth,
      percentage:
        limits.invoicesPerMonth === Infinity
          ? 0
          : ((currentUsage.invoice_count || 0) / limits.invoicesPerMonth) * 100,
    },
    users: {
      current: userCount || 0,
      limit: limits.maxUsers,
      percentage:
        limits.maxUsers === Infinity
          ? 0
          : ((userCount || 0) / limits.maxUsers) * 100,
    },
    storage: {
      bytes: currentUsage.storage_bytes || 0,
    },
    period: currentUsage.period,
  };
}
