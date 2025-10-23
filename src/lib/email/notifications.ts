/**
 * Email Notification Service
 * Handles all email notifications: OCR completion, KSeF submission, manual review, monthly digest
 */

import { emailService } from './client';
import {
  ocrCompletedEmail,
  ksefSubmissionEmail,
  manualReviewEmail,
  monthlyDigestEmail,
  type OCRCompletedEmailData,
  type KSeFSubmissionEmailData,
  type ManualReviewEmailData,
  type MonthlyDigestEmailData,
} from './templates';

export interface NotificationPreferences {
  ocrCompleted: boolean;
  ksefSubmission: boolean;
  manualReview: boolean;
  monthlyDigest: boolean;
}

/**
 * Send OCR Processing Completed notification (FR-038)
 */
export async function sendOCRCompletedNotification(
  email: string,
  data: OCRCompletedEmailData
) {
  const subject = `✅ Przetwarzanie ${data.invoiceCount} faktur zakończone - ${data.tenantName}`;
  const html = ocrCompletedEmail(data);

  return await emailService.sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send KSeF Submission Result notification (FR-038)
 */
export async function sendKSeFSubmissionNotification(
  email: string,
  data: KSeFSubmissionEmailData
) {
  const subject = data.success
    ? `✅ Faktura ${data.invoiceNumber} przesłana do KSeF`
    : `❌ Błąd przesyłania faktury ${data.invoiceNumber} do KSeF`;

  const html = ksefSubmissionEmail(data);

  return await emailService.sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send Manual Review Required notification (FR-038)
 */
export async function sendManualReviewNotification(
  email: string,
  data: ManualReviewEmailData
) {
  const subject = `⚠️ Faktura ${data.invoiceNumber} wymaga przeglądu`;
  const html = manualReviewEmail(data);

  return await emailService.sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send Monthly Digest notification (FR-039)
 */
export async function sendMonthlyDigestNotification(
  email: string,
  data: MonthlyDigestEmailData
) {
  const subject = `📊 Miesięczne podsumowanie ${data.period} - ${data.tenantName}`;
  const html = monthlyDigestEmail(data);

  return await emailService.sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send notification based on type and user preferences
 */
export async function sendNotification(
  type: keyof NotificationPreferences,
  email: string,
  data: OCRCompletedEmailData | KSeFSubmissionEmailData | ManualReviewEmailData | MonthlyDigestEmailData,
  preferences?: NotificationPreferences
) {
  // Check if user wants this notification type
  if (preferences && !preferences[type]) {
    console.log(`Notification ${type} skipped for ${email} (user preference)`);
    return { success: false, error: 'User opted out' };
  }

  // Send appropriate notification
  switch (type) {
    case 'ocrCompleted':
      return await sendOCRCompletedNotification(email, data as OCRCompletedEmailData);

    case 'ksefSubmission':
      return await sendKSeFSubmissionNotification(email, data as KSeFSubmissionEmailData);

    case 'manualReview':
      return await sendManualReviewNotification(email, data as ManualReviewEmailData);

    case 'monthlyDigest':
      return await sendMonthlyDigestNotification(email, data as MonthlyDigestEmailData);

    default:
      return { success: false, error: 'Unknown notification type' };
  }
}

/**
 * Send notifications to multiple recipients (e.g., all tenant admins)
 */
export async function sendBulkNotifications(
  type: keyof NotificationPreferences,
  recipients: Array<{ email: string; preferences?: NotificationPreferences }>,
  data: OCRCompletedEmailData | KSeFSubmissionEmailData | ManualReviewEmailData | MonthlyDigestEmailData
) {
  const results = await Promise.all(
    recipients.map((recipient) =>
      sendNotification(type, recipient.email, data, recipient.preferences)
    )
  );

  return {
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}
