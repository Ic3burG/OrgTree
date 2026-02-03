import { Resend } from 'resend';

// Lazy-initialize Resend client to ensure env vars are loaded first
let resend: Resend | null = null;
let resendInitialized = false;

function getResendClient(): Resend | null {
  if (!resendInitialized) {
    if (process.env.RESEND_API_KEY) {
      resend = new Resend(process.env.RESEND_API_KEY);
    }
    resendInitialized = true;
  }
  return resend;
}

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM_EMAIL = process.env.FROM_EMAIL || 'OrgTree <onboarding@resend.dev>';

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return getResendClient() !== null;
}

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  token: string;
  isReminder?: boolean;
}

interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send an organization invitation email
 */
export async function sendInvitationEmail({
  to,
  inviterName,
  orgName,
  role,
  token,
  isReminder = false,
}: SendInvitationEmailParams): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) {
    console.warn('Email service not configured. Set RESEND_API_KEY to enable emails.');
    return { success: false, error: 'email_not_configured' };
  }

  const inviteUrl = `${APP_URL}/invite/${token}`;
  const roleDescription: Record<string, string> = {
    viewer: 'view',
    editor: 'view and edit',
    admin: 'manage',
  };
  const roleDesc = roleDescription[role] || 'access';

  const subjectPrefix = isReminder ? 'Reminder: ' : '';
  const headerText = isReminder ? 'Invitation Reminder' : "You're Invited!";
  const introText = isReminder
    ? `This is a reminder that <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on OrgTree.`
    : `<strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on OrgTree.`;

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${subjectPrefix}You've been invited to join ${orgName} on OrgTree`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${headerText}</h1>
          </div>

          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-top: 0;">
              ${introText}
            </p>

            <p style="font-size: 14px; color: #64748b;">
              You'll be able to ${roleDesc} this organization's structure and team members.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
              This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              Button not working? Copy and paste this link:<br>
              <a href="${inviteUrl}" style="color: #3b82f6;">${inviteUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
${isReminder ? 'Reminder: ' : ''}You've been invited to join ${orgName} on OrgTree!

${inviterName} has invited you to ${roleDesc} this organization.

Accept your invitation by visiting:
${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this email, you can safely ignore it.
      `.trim(),
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: (err as Error).message };
  }
}

interface TransferEmailParams {
  to: string;
  recipientName: string;
  initiatorName: string;
  orgName: string;
  transferId?: string;
  reason?: string;
}

/**
 * Send ownership transfer initiated email (to recipient)
 */
export async function sendTransferInitiatedEmail({
  to,
  recipientName,
  initiatorName,
  orgName,
}: TransferEmailParams): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) return { success: false, error: 'email_not_configured' };

  const actionUrl = `${APP_URL}/org/settings`; // Directing to settings page

  return client.emails
    .send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Action Required: Organization Ownership Transfer for ${orgName}`,
      html: `
      <h2>Ownership Transfer Request</h2>
      <p>Hello ${recipientName},</p>
      <p><strong>${initiatorName}</strong> has initiated a request to transfer ownership of <strong>${orgName}</strong> to you.</p>
      <p>As the new owner, you will have full administrative control over the organization. The current owner will become an administrator.</p>
      <p>Please log in to review and accept this transfer request within 7 days.</p>
      <a href="${actionUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a>
    `,
    })
    .then(data => ({ success: true, messageId: data.data?.id }))
    .catch(err => ({ success: false, error: err.message }));
}

/**
 * Send ownership transfer accepted email (to old owner)
 */
export async function sendTransferAcceptedEmail({
  to,
  recipientName,
  initiatorName,
  orgName,
}: TransferEmailParams): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) return { success: false, error: 'email_not_configured' };

  return client.emails
    .send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Ownership Transfer Accepted: ${orgName}`,
      html: `
      <h2>Transfer Accepted</h2>
      <p>Hello ${recipientName},</p>
      <p><strong>${initiatorName}</strong> has accepted the ownership transfer for <strong>${orgName}</strong>.</p>
      <p>You are now an administrator of this organization.</p>
    `,
    })
    .then(data => ({ success: true, messageId: data.data?.id }))
    .catch(err => ({ success: false, error: err.message }));
}

/**
 * Send ownership transfer rejected email (to initiator)
 */
export async function sendTransferRejectedEmail({
  to,
  recipientName,
  initiatorName,
  orgName,
  reason,
}: TransferEmailParams): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) return { success: false, error: 'email_not_configured' };

  return client.emails
    .send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Ownership Transfer Rejected: ${orgName}`,
      html: `
      <h2>Transfer Rejected</h2>
      <p>Hello ${recipientName},</p>
      <p><strong>${initiatorName}</strong> has rejected the ownership transfer request for <strong>${orgName}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>You remain the owner of the organization.</p>
    `,
    })
    .then(data => ({ success: true, messageId: data.data?.id }))
    .catch(err => ({ success: false, error: err.message }));
}

/**
 * Send ownership transfer cancelled email (to recipient)
 */
export async function sendTransferCancelledEmail({
  to,
  recipientName,
  initiatorName,
  orgName,
  reason,
}: TransferEmailParams): Promise<EmailResult> {
  const client = getResendClient();
  if (!client) return { success: false, error: 'email_not_configured' };

  return client.emails
    .send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Ownership Transfer Cancelled: ${orgName}`,
      html: `
      <h2>Transfer Cancelled</h2>
      <p>Hello ${recipientName},</p>
      <p><strong>${initiatorName}</strong> has cancelled the ownership transfer request for <strong>${orgName}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    `,
    })
    .then(data => ({ success: true, messageId: data.data?.id }))
    .catch(err => ({ success: false, error: err.message }));
}
