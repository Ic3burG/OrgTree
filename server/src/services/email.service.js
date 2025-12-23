import { Resend } from 'resend';

// Initialize Resend client (will be null if no API key configured)
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM_EMAIL = process.env.FROM_EMAIL || 'OrgTree <onboarding@resend.dev>';

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return resend !== null;
}

/**
 * Send an organization invitation email
 */
export async function sendInvitationEmail({ to, inviterName, orgName, role, token }) {
  if (!resend) {
    console.warn('Email service not configured. Set RESEND_API_KEY to enable emails.');
    return { success: false, error: 'email_not_configured' };
  }

  const inviteUrl = `${APP_URL}/invite/${token}`;
  const roleDescription = {
    viewer: 'view',
    editor: 'view and edit',
    admin: 'manage'
  }[role] || 'access';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You've been invited to join ${orgName} on OrgTree`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>

          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-top: 0;">
              <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on OrgTree.
            </p>

            <p style="font-size: 14px; color: #64748b;">
              You'll be able to ${roleDescription} this organization's structure and team members.
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
You've been invited to join ${orgName} on OrgTree!

${inviterName} has invited you to ${roleDescription} this organization.

Accept your invitation by visiting:
${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this email, you can safely ignore it.
      `.trim()
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: err.message };
  }
}
