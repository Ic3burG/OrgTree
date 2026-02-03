# ADR-025: Invitation Enhancements

**Status**: Accepted
**Date**: 2026-02-03
**Deciders**: Engineering Team
**Tags**: backend, frontend, ux, email, scheduling

## Context and Problem Statement

The current invitation system in OrgTree is functional but basic, suffering from several limitations that increase administrative workload and delay user onboarding:

1. **No Resend Mechanism**: If an invitation expires or the email is lost, administrators must manually delete the old invitation and create a new one.
2. **Fixed Expiry**: The expiry period is hardcoded (defaulting to a specific time) and not easily configurable, which may not suit all organization policies.
3. **No Follow-up**: Users often miss the initial email. Without automated reminders, invitations sit in a pending state indefinitely until manual intervention occurs.

## Decision Drivers

- Reduce administrative overhead for managing invitations.
- Improve user onboarding conversion rates.
- Provide more flexibility in invitation security policies (expiry).
- Enhance the user experience for both admins and invitees.

## Considered Options

- **Option 1: Manual Management Only (Status Quo)** - Admins continue to delete/recreate invitations manually.
- **Option 2: Client-side Logic** - Handle reminders via client-side triggers (rejected due to reliability).
- **Option 3: Server-side Enhancements (Chosen)** - Implement resend endpoints, configurable expiry, and cron-based reminders.

## Decision Outcome

Chosen option: "Option 3: Server-side Enhancements", because it provides a robust, automated solution that solves all identified problems with minimal ongoing maintenance.

### Positive Consequences

- **Reduced Admin Overhead**: Administrators no longer need to manually recreate invitations or send manual reminders.
- **Improved Onboarding**: Automated reminders and easy resends will likely increase the conversion rate of invited users.
- **Flexibility**: Organizations can adjust the invitation window to match their specific security or operational needs.

### Negative Consequences

- **Increased Email Volume**: Automated reminders will increase the total number of emails sent, which could impact quotas on the email provider (Resend).
- **Cron Complexity**: Relying on `node-cron` requires a persistent running server process. If the server sleeps (e.g. valid for some PaaS free tiers), jobs might be missed.

## Implementation Details

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

## Pros and Cons of the Options

### Option 1: Manual Management Only

- **Good**, because it requires zero engineering effort.
- **Bad**, because it frustrates admins and delays onboarding.
- **Bad**, because it lacks professional polish.

### Option 3: Server-side Enhancements (Chosen)

- **Good**, because it completely automates the reminder lifecycle.
- **Good**, because it standardizes the resend process without data duplication.
- **Bad**, because it introduces statefulness (cron jobs) to the server.

## Links

- [Reference] [Original RFC](docs/rfc/invitation-enhancements.md) (archived)
- [Task] Invitation Enhancements Roadmap Item
