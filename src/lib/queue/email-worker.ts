/**
 * Inngest Email Notification Worker Functions
 *
 * Handles email notifications for various events:
 * - OCR job completion
 * - Manual review required
 * - KSeF submission results
 */

import { inngest } from './inngest-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  sendOCRCompletedNotification,
  sendManualReviewNotification,
  type NotificationPreferences,
} from '@/lib/email/notifications';
import type { OCRCompletedEmailData, ManualReviewEmailData } from '@/lib/email/templates';

// Lazy-initialize admin Supabase client for background jobs (no user session)
// This prevents build-time errors when env vars aren't available
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
}

/**
 * Fetch all admin/owner users for a tenant
 */
async function getTenantAdmins(tenantId: string): Promise<Array<{ email: string; preferences?: NotificationPreferences }>> {
  const supabase = getSupabaseAdmin();

  // Fetch tenant members with OWNER or ADMIN role
  const { data: members, error } = await supabase
    .from('tenant_members')
    .select(`
      userId,
      role,
      users!inner(email)
    `)
    .eq('tenant_id', tenantId)
    .in('role', ['OWNER', 'ADMIN']);

  if (error || !members) {
    console.error('[Email Worker] Failed to fetch tenant admins:', error);
    return [];
  }

  // Map to email addresses
  // TODO: Fetch user preferences from user_settings table when implemented
  return members.map((member) => ({
    email: (member.users as unknown as { email: string }).email,
    preferences: undefined, // Default: all notifications enabled
  }));
}

/**
 * OCR Job Completion Handler
 * Triggered by 'ocr/job.completed' event from OCR worker
 */
export const notifyOCRCompleted = inngest.createFunction(
  {
    id: 'notify-ocr-completed',
    name: 'Send OCR Completion Email',
    retries: 2,
  },
  { event: 'ocr/job.completed' },
  async ({ event, step }) => {
    const { job_id, invoice_id, tenant_id } = event.data;

    console.log(`[Email Worker] Sending OCR completion notification for job ${job_id}`);

    // Fetch invoice and tenant data
    const { invoice, tenant, admins } = await step.run('fetch-data', async () => {
      const supabase = getSupabaseAdmin();

      // Fetch invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('invoice_number, status, overall_confidence, seller_nip')
        .eq('id', invoice_id)
        .single();

      if (invoiceError || !invoiceData) {
        throw new Error(`Failed to fetch invoice: ${invoiceError?.message}`);
      }

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenant_id)
        .single();

      if (tenantError || !tenantData) {
        throw new Error(`Failed to fetch tenant: ${tenantError?.message}`);
      }

      // Fetch tenant admins
      const adminList = await getTenantAdmins(tenant_id);

      return {
        invoice: invoiceData as {
          invoice_number: string | null;
          status: string;
          overall_confidence: number | null;
          seller_nip: string | null;
        },
        tenant: tenantData as { name: string },
        admins: adminList,
      };
    });

    // Send email notifications
    const { successCount, failedCount } = await step.run('send-emails', async () => {
      const emailData: OCRCompletedEmailData = {
        tenantName: tenant.name,
        invoiceCount: 1,
        successCount: invoice.status === 'EXTRACTED' || invoice.status === 'NEEDS_REVIEW' ? 1 : 0,
        failedCount: invoice.status === 'FAILED' ? 1 : 0,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice_id}`,
      };

      let success = 0;
      let failed = 0;

      for (const admin of admins) {
        try {
          const result = await sendOCRCompletedNotification(admin.email, emailData);
          if (result.success) {
            success++;
          } else {
            failed++;
            console.error(`[Email Worker] Failed to send to ${admin.email}:`, result.error);
          }
        } catch (error) {
          failed++;
          console.error(`[Email Worker] Exception sending to ${admin.email}:`, error);
        }
      }

      return { successCount: success, failedCount: failed };
    });

    // Check if manual review is required (confidence < 80%)
    if (invoice.overall_confidence && invoice.overall_confidence < 0.8) {
      await step.run('send-manual-review-emails', async () => {
        const reviewEmailData: ManualReviewEmailData = {
          tenantName: tenant.name,
          invoiceNumber: invoice.invoice_number || 'N/A',
          issueDate: new Date().toISOString().split('T')[0], // Simplified for now
          sellerName: `NIP: ${invoice.seller_nip || 'N/A'}`,
          confidence: Math.round((invoice.overall_confidence || 0) * 100),
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice_id}`,
          reasons: ['Niska pewność rozpoznania danych'],
        };

        for (const admin of admins) {
          try {
            await sendManualReviewNotification(admin.email, reviewEmailData);
          } catch (error) {
            console.error(`[Email Worker] Failed to send manual review email to ${admin.email}:`, error);
          }
        }
      });
    }

    console.log(`[Email Worker] OCR completion notifications sent: ${successCount} success, ${failedCount} failed`);

    return {
      job_id,
      invoice_id,
      emails_sent: successCount,
      emails_failed: failedCount,
    };
  }
);
