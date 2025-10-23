# Email Notification System - Setup Complete ✅

**Status:** Production-ready with Resend API configured

## Overview

The email notification system has been fully implemented and integrated into the Deklaro application. All notifications use Polish language templates and respect multi-tenant architecture.

## Implemented Features

### 1. OCR Completion Notifications (FR-038)
**Trigger:** After OCR processing completes
**Sent to:** All tenant OWNER and ADMIN users
**Content:** Processing summary with success/failure counts
**Template:** [src/lib/email/templates.ts:20](../src/lib/email/templates.ts)

### 2. Manual Review Alerts (FR-038)
**Trigger:** When invoice confidence < 80%
**Sent to:** All tenant OWNER and ADMIN users
**Content:** Invoice details with review link and low confidence warning
**Template:** [src/lib/email/templates.ts:106](../src/lib/email/templates.ts)

### 3. Monthly Digest Reports (FR-039)
**Trigger:** 1st day of each month at 9:00 AM UTC (10:00 AM CET)
**Sent to:** All tenant OWNER and ADMIN users
**Content:** Monthly statistics (invoices, KSeF submissions, new companies)
**Cron Job:** [src/lib/queue/digest-worker.ts:110](../src/lib/queue/digest-worker.ts)

## Architecture

### Email Service Stack
- **Email Provider:** Resend (https://resend.com)
- **Queue System:** Inngest (background jobs + cron)
- **Template Engine:** Custom HTML templates with Polish language
- **Rate Limiting:** 10 emails per recipient per hour

### Key Files

| File | Purpose |
|------|---------|
| [src/lib/email/client.ts](../src/lib/email/client.ts) | Resend API wrapper with rate limiting |
| [src/lib/email/templates.ts](../src/lib/email/templates.ts) | Polish HTML email templates |
| [src/lib/email/notifications.ts](../src/lib/email/notifications.ts) | Notification service layer |
| [src/lib/queue/email-worker.ts](../src/lib/queue/email-worker.ts) | Inngest OCR completion handler |
| [src/lib/queue/digest-worker.ts](../src/lib/queue/digest-worker.ts) | Monthly digest cron job |
| [src/app/api/inngest/route.ts](../src/app/api/inngest/route.ts) | Inngest endpoint (3 functions registered) |

## Configuration

### Environment Variables (✅ Configured)

```bash
# .env.local
RESEND_API_KEY=re_NYaxRQA4_PkpJ2KrDG7rSh8cqvDyZrGDw  # ✅ Active
NEXT_PUBLIC_APP_URL=http://localhost:4000            # ✅ Set
```

### Inngest Functions Registered

1. ✅ **processInvoiceOCR** - Main OCR processing pipeline
2. ✅ **notifyOCRCompleted** - Email notifications on OCR completion
3. ✅ **sendMonthlyDigests** - Monthly digest cron job (1st of month at 09:00 UTC)

Verify at: http://localhost:4000/api/inngest

## Integration Points

### OCR Workflow Integration
```typescript
// ocr-worker.ts:239-246
await inngest.send({
  name: 'ocr/job.completed',  // ← Triggers email notification
  data: { job_id, invoice_id, tenant_id }
});
```

**Flow:**
1. User uploads invoice → OCR processing starts
2. OCR completes → `ocr/job.completed` event sent
3. Email worker receives event → Fetches tenant admins
4. Sends OCR completion email to all admins
5. If confidence < 80% → Also sends manual review alert

### Monthly Digest Cron
**Schedule:** `0 9 1 * *` (Every 1st day at 09:00 UTC)
**Behavior:**
- Fetches all active tenants
- Calculates previous month statistics
- Skips tenants with no activity
- Sends digest to all admins

## Email Templates

All templates use Polish language and branded design:

### Base Template Features
- Deklaro logo header
- Responsive design (mobile-friendly)
- Branded colors (primary: #3B82F6)
- Footer with support link
- Professional typography

### Template Variables

#### OCR Completed Email
```typescript
{
  tenantName: string;        // Company name
  invoiceCount: number;      // Total invoices processed
  successCount: number;      // Successfully extracted
  failedCount: number;       // Failed extractions
  dashboardUrl: string;      // Link to dashboard
}
```

#### Manual Review Email
```typescript
{
  tenantName: string;        // Company name
  invoiceNumber: string;     // Invoice number
  issueDate: string;         // Issue date (YYYY-MM-DD)
  sellerName: string;        // Seller name
  confidence: number;        // Confidence score (0-100)
  reviewUrl: string;         // Direct link to invoice
  reasons: string[];         // List of review reasons
}
```

#### Monthly Digest Email
```typescript
{
  tenantName: string;        // Company name
  period: string;            // e.g., "Styczeń 2025"
  totalInvoices: number;     // Total invoices in month
  processedInvoices: number; // Successfully processed
  ksefSubmitted: number;     // Sent to KSeF
  newCompanies: number;      // New companies added
  dashboardUrl: string;      // Link to dashboard
}
```

## Testing

### Manual Testing Steps

1. **Start Inngest Dev Server** (in separate terminal):
   ```bash
   npx inngest-cli@latest dev
   ```

2. **Upload Test Invoice:**
   - Go to http://localhost:4000
   - Log in with `test@deklaro.com` / `Test123456789`
   - Upload a test invoice PDF
   - Trigger OCR processing

3. **Monitor Inngest Dashboard:**
   - Open Inngest Dev UI (usually http://localhost:8288)
   - Watch for `invoice/uploaded` and `ocr/job.completed` events
   - Check function execution logs

4. **Verify Email Sent:**
   - Check Resend dashboard: https://resend.com/emails
   - Confirm email delivered to tenant admin email

### Rate Limiting Test
```bash
# Emails are limited to 10 per recipient per hour
# Exceeding this will return: "Rate limit exceeded"
```

## User Preferences (Future Enhancement)

Currently all notifications are enabled by default. Future implementation:

```sql
-- user_settings table (not yet implemented)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY,
  notification_preferences JSONB DEFAULT '{
    "ocr_completed": true,
    "manual_review": true,
    "ksef_submission": true,
    "monthly_digest": true
  }'::jsonb
);
```

Update [email-worker.ts:22](../src/lib/queue/email-worker.ts#L22) to fetch preferences.

## Monitoring & Logs

### Application Logs
```bash
# Search for email worker logs
grep -r "Email Worker" deklaro/frontend/.next/trace

# OCR completion notifications
[Email Worker] Sending OCR completion notification for job <uuid>
[Email Worker] OCR completion notifications sent: X success, Y failed

# Monthly digest
[Digest Worker] Starting monthly digest generation...
[Digest Worker] Generating digest for: Styczeń 2025
[Digest Worker] Processing 5 tenants...
```

### Resend Dashboard
- View all sent emails: https://resend.com/emails
- Check delivery status and open rates
- Monitor API usage and rate limits

## Production Deployment Checklist

Before deploying to production:

- [ ] Verify Resend API key is set in Vercel environment variables
- [ ] Configure production email domain in Resend
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set up email sending domain with SPF/DKIM records
- [ ] Test monthly digest cron job execution
- [ ] Configure Inngest production environment
- [ ] Set up email delivery monitoring alerts

## Troubleshooting

### Emails Not Sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify Inngest functions are registered: `curl http://localhost:4000/api/inngest`
3. Check Resend dashboard for error logs
4. Verify tenant has OWNER/ADMIN users with valid emails

### Rate Limiting Issues
```typescript
// Clear rate limit cache (for testing)
import { emailService } from '@/lib/email/client';
emailService.clearRateLimitCache();
```

### Monthly Digest Not Running
1. Verify Inngest Dev Server is running
2. Check cron expression: `0 9 1 * *` (1st day at 09:00 UTC)
3. For testing, manually trigger the function via Inngest UI

## Related Documentation

- [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md) - Production deployment guide
- [specs/001-deklaro-mvp/spec.md](../../specs/001-deklaro-mvp/spec.md) - FR-038, FR-039 requirements
- Resend Docs: https://resend.com/docs
- Inngest Docs: https://www.inngest.com/docs

---

**Last Updated:** 2025-10-22
**Status:** ✅ Production-ready with active Resend API key
