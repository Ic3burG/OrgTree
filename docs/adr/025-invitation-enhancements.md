# 25. Invitation Enhancements

Date: 2026-02-03

## Status

Accepted

## Context

The current invitation system in OrgTree is functional but basic, suffering from several limitations that increase administrative workload and delay user onboarding:

1.  **No Resend Mechanism**: If an invitation expires or the email is lost, administrators must manually delete the old invitation and create a new one.
2.  **Fixed Expiry**: The expiry period is hardcoded (defaulting to a specific time) and not easily configurable, which may not suit all organization policies.
3.  **No Follow-up**: Users often miss the initial email. Without automated reminders, invitations sit in a pending state indefinitely until manual intervention occurs.

## Decision

We will enhance the invitation system by implementing the following three key features:

### 1. Resend Capability

We will add a mechanism to resend invitations directly from the management interface.

- **Endpoint**: `POST /api/invitations/:id/resend`
- **Logic**:
  - If the invitation is **expired**, generate a new token and update the expiration date.
  - If the invitation is **active**, optionally rotate the token and resend the email.
- **Frontend**: Add a "Resend" button to the "Pending Invitations" list and display success notifications.

### 2. Custom Expiry Periods

We will make the invitation validity period configurable via environment variables.

- **Environment Variable**: `INVITATION_EXPIRY_DAYS` (default: `7`).
- **Implementation**: Calculate `expires_at` based on this variable during invitation creation or renewal.

### 3. Reminder Emails

We will automate follow-up emails for pending invitations using the existing `node-cron` library.

- **Schedule**: Run daily (e.g., 09:00 UTC).
- **Logic**:
  - Query invitations that are `pending`, expiring in 24-48 hours, and have not yet received a reminder (`last_reminder_sent_at` is NULL).
  - Send a "Reminder: Your invitation to OrgTree expires soon" email.
  - Update the `last_reminder_sent_at` timestamp.
- **Schema Change**: Add `last_reminder_sent_at` (DATETIME, nullable) to the `invitations` table.

## Consequences

### Positive

- **Reduced Admin Overhead**: Administrators no longer need to manually recreate invitations or send manual reminders.
- **Improved Onboarding**: Automated reminders and easy resends will likely increase the conversion rate of invited users.
- **Flexibility**: Organizations can adjust the invitation window to match their specific security or operational needs.

### Negative

- **Increased Email Volume**: Automated reminders will increase the total number of emails sent, which could impact quotas on the email provider (Resend).
- **Cron Complexity**: Relying on `node-cron` in a potentially serverless or ephemeral environment (like some Render configurations) can be unreliable if the instance spins down. However, for our current persistent server setup, this is acceptable.

## References

- Original RFC: `docs/rfc/invitation-enhancements.md` (now migrated to this ADR)
- GitHub Issue/Roadmap: "Invitation Enhancements"
