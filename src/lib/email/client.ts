/**
 * Email Service Client (Resend)
 * Handles all email notifications for Deklaro
 */

import { Resend } from 'resend';

// Lazy-initialize Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required for email service');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service Class
 */
class EmailService {
  private defaultFrom = process.env.EMAIL_FROM || 'Deklaro <noreply@deklaro.app>';
  private rateLimitCache = new Map<string, number>();
  private readonly RATE_LIMIT_PER_HOUR = 10; // Max 10 emails per recipient per hour

  /**
   * Check if recipient has exceeded rate limit
   */
  private checkRateLimit(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();
    const lastSent = this.rateLimitCache.get(key);

    if (!lastSent) {
      this.rateLimitCache.set(key, now);
      return true;
    }

    // Allow if more than 1 hour passed
    const hourInMs = 60 * 60 * 1000;
    if (now - lastSent > hourInMs) {
      this.rateLimitCache.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Validate Resend API key
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured. Email sending disabled.');
        return {
          success: false,
          error: 'Email service not configured',
        };
      }

      // Validate recipients
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      if (recipients.length === 0) {
        return {
          success: false,
          error: 'No recipients provided',
        };
      }

      // Check rate limit for first recipient
      if (!this.checkRateLimit(recipients[0])) {
        console.warn(`Rate limit exceeded for ${recipients[0]}`);
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Send email via Resend (lazy-initialized)
      const resend = getResendClient();
      const response = await resend.emails.send({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
      });

      if (response.error) {
        console.error('Resend API error:', response.error);
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email to multiple recipients (batch)
   */
  async sendBatchEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results = await Promise.all(emails.map((email) => this.sendEmail(email)));
    return results;
  }

  /**
   * Clear rate limit cache (for testing)
   */
  clearRateLimitCache() {
    this.rateLimitCache.clear();
  }
}

// Export singleton instance
export const emailService = new EmailService();
