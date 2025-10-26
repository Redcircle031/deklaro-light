/**
 * Tenant Invitation Emails
 *
 * Handles sending invitation emails using Resend.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvitationEmailParams {
  /** Recipient email */
  to: string;

  /** Tenant/organization name */
  tenantName: string;

  /** Person who sent the invitation */
  inviterName: string;

  /** Role being invited to */
  role: 'OWNER' | 'ACCOUNTANT' | 'CLIENT';

  /** Invitation token */
  invitationToken: string;

  /** Expiration date */
  expiresAt: Date;

  /** Optional personal message from inviter */
  message?: string;
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(params: InvitationEmailParams): Promise<void> {
  const {
    to,
    tenantName,
    inviterName,
    role,
    invitationToken,
    expiresAt,
    message,
  } = params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
  const inviteUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`;

  const roleNames = {
    OWNER: 'Owner',
    ACCOUNTANT: 'Accountant',
    CLIENT: 'Client',
  };

  const roleDescriptions = {
    OWNER: 'full administrative access',
    ACCOUNTANT: 'accounting and invoice management access',
    CLIENT: 'read-only access to invoices',
  };

  const expiresInDays = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deklaro <noreply@deklaro.com>',
      to,
      subject: `You've been invited to join ${tenantName} on Deklaro`,
      html: createInvitationEmailHTML({
        tenantName,
        inviterName,
        roleName: roleNames[role],
        roleDescription: roleDescriptions[role],
        inviteUrl,
        expiresInDays,
        message,
      }),
    });

    console.log('[Invitation Email] Sent invitation to:', to);
  } catch (error) {
    console.error('[Invitation Email] Failed to send:', error);
    throw error;
  }
}

/**
 * Create invitation email HTML
 */
function createInvitationEmailHTML(params: {
  tenantName: string;
  inviterName: string;
  roleName: string;
  roleDescription: string;
  inviteUrl: string;
  expiresInDays: number;
  message?: string;
}): string {
  const {
    tenantName,
    inviterName,
    roleName,
    roleDescription,
    inviteUrl,
    expiresInDays,
    message,
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${tenantName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 32px;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo h1 {
      color: #2563eb;
      font-size: 28px;
      margin: 0;
    }
    h2 {
      color: #111827;
      font-size: 20px;
      margin: 0 0 16px 0;
    }
    .message {
      background: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 16px;
      margin: 24px 0;
      font-style: italic;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 24px 0;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .details {
      background: #f9fafb;
      padding: 16px;
      border-radius: 6px;
      margin: 24px 0;
    }
    .details dt {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-top: 12px;
    }
    .details dt:first-child {
      margin-top: 0;
    }
    .details dd {
      margin: 4px 0 0 0;
      color: #111827;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 16px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>Deklaro</h1>
    </div>

    <h2>You've been invited!</h2>

    <p>
      <strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong>
      on Deklaro as a <strong>${roleName}</strong>.
    </p>

    ${message ? `
    <div class="message">
      <strong>Personal message:</strong><br>
      ${escapeHtml(message)}
    </div>
    ` : ''}

    <dl class="details">
      <dt>Organization</dt>
      <dd>${tenantName}</dd>

      <dt>Role</dt>
      <dd>${roleName}</dd>

      <dt>Access Level</dt>
      <dd>${roleDescription}</dd>

      <dt>Invited By</dt>
      <dd>${inviterName}</dd>
    </dl>

    <div style="text-align: center;">
      <a href="${inviteUrl}" class="button">
        Accept Invitation
      </a>
    </div>

    <div class="warning">
      <strong>⏰ This invitation expires in ${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}.</strong><br>
      Please accept it before it expires.
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
    </p>

    <div class="footer">
      <p>
        This invitation was sent by ${inviterName} through Deklaro.<br>
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
      <p style="margin-top: 12px;">
        <a href="https://deklaro.com" style="color: #2563eb; text-decoration: none;">Deklaro</a> -
        Invoice Automation for Polish Businesses
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Send invitation reminder email
 */
export async function sendInvitationReminder(params: {
  to: string;
  tenantName: string;
  invitationToken: string;
  expiresAt: Date;
}): Promise<void> {
  const { to, tenantName, invitationToken, expiresAt } = params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
  const inviteUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`;

  const expiresInDays = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deklaro <noreply@deklaro.com>',
      to,
      subject: `Reminder: Your invitation to ${tenantName} expires soon`,
      html: `
        <p>This is a reminder that your invitation to join <strong>${tenantName}</strong> on Deklaro will expire in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>.</p>
        <p><a href="${inviteUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a></p>
        <p>If you have any questions, please contact the person who invited you.</p>
      `,
    });

    console.log('[Invitation Email] Sent reminder to:', to);
  } catch (error) {
    console.error('[Invitation Email] Failed to send reminder:', error);
    throw error;
  }
}
