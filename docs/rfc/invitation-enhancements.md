# RFC: Invitation Enhancements

> **Status**: Proposed
> **Created**: 2026-01-29
> **Related Roadmap Item**: Invitation Enhancements

## Summary

This RFC proposes enhancements to the user invitation system to improve the onboarding experience and reduce administrative overhead. The key features include the ability to resend invitations, configure custom expiry periods, and send automated reminder emails for pending invitations.

## Motivation

The current invitation system is functional but basic. It suffers from the following limitations:

1. **No Resend Mechanism**: If an invitation expires or the email is lost, administrators must delete the old invitation and create a new one.
2. **Fixed Expiry**: The expiry period is hardcoded or not easily configurable, which may not suit all organization policies.
3. **No Follow-up**: Users often miss the initial email. Without reminders, invitations sit in a pending state indefinitely until manual intervention.

These limitations increase the workload for administrators and delay user onboarding.

## Detailed Design

### 1. Resend Capability

We will implement a mechanism to resend invitations directly from the management interface.

#### Backend

- **Endpoint**: `POST /api/invitations/:id/resend`
- **Logic**:
  - Verify the invitation exists and is in a `pending` state.
  - If the invitation is **expired**:
    - Generate a new secure token.
    - Update `expires_at` based on the configured retention period.
    - Send a standard "You have been invited" email.
  - If the invitation is **active** (not expired):
    - Optionally rotate the token for security (or keep the same if valid for >24h).
    - Send the email.
  - Return success response.

#### Frontend

- Update the "Pending Invitations" list in the Admin settings.
- Add a "Resend" action button next to pending items.
- Display a toast notification on success: "Invitation resent to [email]".

### 2. Custom Expiry Periods

We will make the invitation validity period configurable via environment variables in the short term, with potential for UI configuration later.

#### Configuration

- **New Environment Variable**: `INVITATION_EXPIRY_DAYS` (default: `7`).
- **Database Impact**: When creating an invitation, calculate `expires_at` as `NOW() + INVITATION_EXPIRY_DAYS`.

### 3. Reminder Emails

To improved conversion rates, we will automate follow-ups for pending invitations.

#### Architecture

- Use the existing `node-cron` library (already present in `server/package.json`) to schedule a daily job.
- **Schedule**: Run daily (e.g., 09:00 UTC).

#### Logic

1. **Query**: Select invitations where:
   - `status` is 'pending'.
   - `expires_at` is between 24 and 48 hours from now (i.e., expiring tomorrow).
   - `last_reminder_sent_at` is NULL (to ensure we only send one reminder).
2. **Action**:
   - Iterate through the list.
   - Send a "Reminder: Your invitation to OrgTree expires soon" email.
   - Update `last_reminder_sent_at` timestamp.

#### Data Model Changes

- **Table**: `invitations`
- **New Column**: `last_reminder_sent_at` (DATETIME, nullable).

## Alternatives Considered

- **Manual Reminders**: Relying on admins to manually click "Resend". This is simpler to implement but keeps the administrative burden high.
- **Complex Queueing (BullMQ/Redis)**: Implementing a full job queue. This was rejected as over-engineering for the current scale and infrastructure complexity (requires Redis). `node-cron` is sufficient for this specific use case.

## Drawbacks

- **Email Volume**: Automated reminders increase the number of emails sent, which may impact quotas on the email provider (Resend).
- **Cron Reliability**: In a serverless environment (like Render web services), cron jobs might be unreliable if the service spins down. However, OrgTree server is typically a long-running instance. _Note: If moving to serverless functions, this logic should move to a dedicated Cron trigger._

## Unresolved Questions

- **UI Configuration**: Should the expiry days be configurable in the UI per invitation?
  - _Decision_: No, stick to global env var for now to keep the UI clean.
