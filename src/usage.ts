import { PrismaClient, SubscriptionTier } from '@prisma/client'

const prisma = new PrismaClient()

const SUBSCRIPTION_LIMITS = {
  [SubscriptionTier.STARTER]: 100,
  [SubscriptionTier.PRO]: 500,
  [SubscriptionTier.ENTERPRISE]: Infinity,
}

/**
 * Checks if a tenant has exceeded their monthly invoice upload limit.
 * @param tenantId The ID of the tenant.
 * @returns A promise that resolves to true if the limit is exceeded, false otherwise.
 */
export async function isInvoiceLimitExceeded(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subscription: true },
  })

  if (!tenant || tenant.subscription === SubscriptionTier.ENTERPRISE) {
    return false // Enterprise has no limit, or tenant not found (should not happen)
  }

  const limit = SUBSCRIPTION_LIMITS[tenant.subscription]
  const currentPeriod = new Date().toISOString().slice(0, 7) // Format: YYYY-MM

  const usageRecord = await prisma.usageRecord.findUnique({
    where: {
      tenantId_period: {
        tenantId,
        period: currentPeriod,
      },
    },
  })

  return (usageRecord?.invoiceCount ?? 0) >= limit
}

/**
 * Increments the invoice count for a tenant for the current billing period.
 * If no record exists for the period, it creates one.
 * @param tenantId The ID of the tenant to update.
 */
export async function incrementInvoiceCount(tenantId: string): Promise<void> {
  const currentPeriod = new Date().toISOString().slice(0, 7) // Format: YYYY-MM

  await prisma.usageRecord.upsert({
    where: {
      tenantId_period: {
        tenantId,
        period: currentPeriod,
      },
    },
    update: {
      invoiceCount: {
        increment: 1,
      },
    },
    create: {
      tenantId,
      period: currentPeriod,
      invoiceCount: 1,
    },
  })
}

/**
 * Retrieves the current invoice usage and limit for a tenant.
 * @param tenantId The ID of the tenant.
 * @returns An object with the current count, limit, usage percentage, and plan.
 */
export async function getCurrentUsage(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subscription: true },
  })

  if (!tenant) {
    return { count: 0, limit: 0, percentage: 0, plan: SubscriptionTier.STARTER }
  }

  const limit = SUBSCRIPTION_LIMITS[tenant.subscription]
  const currentPeriod = new Date().toISOString().slice(0, 7) // Format: YYYY-MM

  const usageRecord = await prisma.usageRecord.findUnique({
    where: {
      tenantId_period: {
        tenantId,
        period: currentPeriod,
      },
    },
  })

  const count = usageRecord?.invoiceCount ?? 0
  const percentage = limit === Infinity ? 0 : Math.round((count / limit) * 100)
  const plan = tenant.subscription

  return { count, limit, percentage, plan }
}