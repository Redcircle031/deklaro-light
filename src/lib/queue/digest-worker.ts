/**
 * Inngest Monthly Digest Worker
 *
 * Sends monthly email digest to all tenant admins
 * Runs on the 1st day of each month at 9:00 AM UTC
 */

import { inngest } from './inngest-client';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { sendMonthlyDigestNotification, type NotificationPreferences } from '@/lib/email/notifications';
import type { MonthlyDigestEmailData } from '@/lib/email/templates';

/**
 * Get month name in Polish
 */
function getPolishMonthName(month: number): string {
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  return months[month];
}

/**
 * Fetch all admin/owner users for a tenant
 */
async function getTenantAdmins(tenantId: string): Promise<Array<{ email: string; preferences?: NotificationPreferences }>> {
  const supabase = await getServerSupabaseClient();

  const { data: members, error } = await supabase
    .from('tenant_members')
    .select(`
      userId,
      role,
      users!inner(email)
    `)
    .eq('tenantId', tenantId)
    .in('role', ['OWNER', 'ADMIN']);

  if (error || !members) {
    console.error('[Digest Worker] Failed to fetch tenant admins:', error);
    return [];
  }

  return members.map((member) => ({
    email: (member.users as unknown as { email: string }).email,
    preferences: undefined, // Default: all notifications enabled
  }));
}

/**
 * Calculate statistics for a tenant for the previous month
 */
async function calculateMonthlyStats(tenantId: string, startDate: string, endDate: string) {
  const supabase = await getServerSupabaseClient();

  // Fetch all invoices from previous month
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, status, created_at, seller_nip, buyer_nip')
    .eq('tenantId', tenantId)
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  if (error || !invoices) {
    console.error('[Digest Worker] Failed to fetch invoices:', error);
    return {
      totalInvoices: 0,
      processedInvoices: 0,
      ksefSubmitted: 0,
      newCompanies: 0,
    };
  }

  // Calculate stats
  const totalInvoices = invoices.length;
  const processedInvoices = invoices.filter(
    (inv) => inv.status === 'EXTRACTED' || inv.status === 'APPROVED' || inv.status === 'SENT_TO_KSEF'
  ).length;

  // Count KSeF submissions
  const { count: ksefCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('status', 'SENT_TO_KSEF')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  // Count new companies (unique NIPs from invoices)
  const uniqueNIPs = new Set<string>();
  invoices.forEach((inv) => {
    if (inv.seller_nip) uniqueNIPs.add(inv.seller_nip);
    if (inv.buyer_nip) uniqueNIPs.add(inv.buyer_nip);
  });

  // Check which NIPs are new this month (created_at in this month)
  const { count: newCompaniesCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  return {
    totalInvoices,
    processedInvoices,
    ksefSubmitted: ksefCount || 0,
    newCompanies: newCompaniesCount || 0,
  };
}

/**
 * Monthly Digest Cron Job
 * Runs on the 1st day of each month at 9:00 AM UTC (10:00 AM CET / 11:00 AM CEST)
 */
export const sendMonthlyDigests = inngest.createFunction(
  {
    id: 'send-monthly-digests',
    name: 'Send Monthly Digest Emails',
    retries: 2,
  },
  { cron: '0 9 1 * *' }, // Every 1st day of month at 9:00 AM UTC
  async ({ step }) => {
    console.log('[Digest Worker] Starting monthly digest generation...');

    // Calculate previous month date range
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startDate = previousMonth.toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const period = `${getPolishMonthName(previousMonth.getMonth())} ${previousMonth.getFullYear()}`;

    console.log(`[Digest Worker] Generating digest for: ${period}`);

    // Fetch all active tenants
    const tenants = await step.run('fetch-tenants', async () => {
      const supabase = await getServerSupabaseClient();

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('status', 'ACTIVE');

      if (error || !data) {
        throw new Error(`Failed to fetch tenants: ${error?.message}`);
      }

      return data;
    });

    console.log(`[Digest Worker] Processing ${tenants.length} tenants...`);

    // Process each tenant
    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        return await step.run(`process-tenant-${tenant.id}`, async () => {
          // Calculate stats for this tenant
          const stats = await calculateMonthlyStats(tenant.id, startDate, endDate);

          // Skip if no activity this month
          if (stats.totalInvoices === 0) {
            console.log(`[Digest Worker] Skipping ${tenant.name} (no activity)`);
            return { tenant: tenant.name, sent: 0, skipped: true };
          }

          // Fetch tenant admins
          const admins = await getTenantAdmins(tenant.id);

          if (admins.length === 0) {
            console.log(`[Digest Worker] No admins found for tenant: ${tenant.name}`);
            return { tenant: tenant.name, sent: 0, noAdmins: true };
          }

          // Prepare email data
          const emailData: MonthlyDigestEmailData = {
            tenantName: tenant.name,
            period,
            totalInvoices: stats.totalInvoices,
            processedInvoices: stats.processedInvoices,
            ksefSubmitted: stats.ksefSubmitted,
            newCompanies: stats.newCompanies,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          };

          // Send to all admins
          let sent = 0;
          for (const admin of admins) {
            try {
              const result = await sendMonthlyDigestNotification(admin.email, emailData);
              if (result.success) {
                sent++;
              } else {
                console.error(`[Digest Worker] Failed to send to ${admin.email}:`, result.error);
              }
            } catch (error) {
              console.error(`[Digest Worker] Exception sending to ${admin.email}:`, error);
            }
          }

          console.log(`[Digest Worker] Sent ${sent}/${admins.length} digests for ${tenant.name}`);

          return { tenant: tenant.name, sent, total: admins.length };
        });
      })
    );

    // Summarize results
    const summary = results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled') {
          acc.successful++;
          acc.totalSent += result.value.sent || 0;
        } else {
          acc.failed++;
          console.error('[Digest Worker] Tenant processing failed:', result.reason);
        }
        return acc;
      },
      { successful: 0, failed: 0, totalSent: 0 }
    );

    console.log(
      `[Digest Worker] Monthly digest complete: ${summary.successful} tenants processed, ` +
      `${summary.totalSent} emails sent, ${summary.failed} failures`
    );

    return {
      period,
      tenants_processed: summary.successful,
      emails_sent: summary.totalSent,
      failures: summary.failed,
    };
  }
);
