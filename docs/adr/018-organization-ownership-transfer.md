# 018. Organization Ownership Transfer and Super User Succession

Date: 2026-01-27

## Status

Accepted

## Context

OrgTree requires a mechanism to transfer the "Super User" (Organization Owner) role from one user to another. Previously, ownership was immutable or required manual database intervention. This created a single point of failure and operational bottleneck when organizational leadership changed.

We needed a secure, auditable, and self-service way for Organization Owners to transfer their privileges to another member/admin, ensuring business continuity.

## Decision

We have implemented a dedicated **Ownership Transfer System** with the following key characteristics:

### 1. Terminology

We have formally adopted the term **"Organization Owner"** in user-facing interfaces to represent the user with the highest privilege level, replacing "Super User" which is retained only in code/database legacy contexts where necessary.

### 2. Workflow

The transfer process follows a strict **Initiate -> Accept** workflow:

1. **Initiation**: The current Owner selects a successor and provides a reason. This enters a `pending` state.
2. **Notification**: The successor is notified via email and in-app banner.
3. **Acceptance**: The successor must explicitly accept the transfer, acknowledging the new responsibilities.
4. **Completion**: Upon acceptance, the roles are swapped atomically. The previous Owner becomes an Admin, and the successor becomes the Owner.

### 3. Security Controls

- **Permission Gating**: Only the current Organization Owner can initiate a transfer.
- **Eligibility**: Any existing member of the organization can be nominated.
- **Re-authentication**: Both initiation and acceptance require password re-entry to prevent session hijacking attacks.
- **Audit Logging**: All actions (initiate, accept, reject, cancel) are permanently recorded in a dedicated `ownership_transfer_audit_log` table with IP address and User Agent data.
- **Expiration**: Pending transfers automatically expire after 7 days to prevent stale invitations from becoming security risks.

### 4. Database Schema

We introduced two new tables:

- `ownership_transfers`: Tracks the lifecycle of a transfer request.
- `ownership_transfer_audit_log`: Immutable history of all transfer-related actions.

### 5. Role Transition

We decided to **automatically demote** the previous owner to an `admin` role rather than removing them or keeping them as a secondary owner. This enforces the "Single Owner" principle which simplifies permission logic and accountability.

## Consequences

### Positive

- **Business Continuity**: Organizations often outlive their initial creators. This feature allows OrgTree to support long-lived organizations.
- **Security**: The strict auditable workflow reduces the risk of social engineering or accidental privilege escalations.
- **Operational Efficiency**: Eliminates the need for manual database updates by support staff.

### Negative

- **Complexity**: The transfer logic introduces complex state management (pending, expired, cancelled) that must be maintained.
- **Irreversibility**: Once transferred, the original owner loses their supreme privileges and cannot reclaim them unless the new owner transfers them back. This is a deliberate design choice but carries user experience risk.

## Compliance

This implementation supports:

- **Change Management**: All leadership changes are fully audited.
- **Non-repudiation**: Re-authentication ensures actions are attributed to the correct actor.
