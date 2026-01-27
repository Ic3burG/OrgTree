# Organization Ownership Transfer

**Priority**: High
**Status**: 📋 Planned
**Date Created**: January 26, 2026
**Last Updated**: January 26, 2026

## Context and Problem Statement

Organizations in the OrgTree system currently lack a formal mechanism for transferring ownership from one Super User to another. This creates several critical issues:

1. **Succession Planning**: When a Super User leaves the organization or changes roles, there's no clear path to transfer administrative control.
2. **Security Risk**: Without proper transfer mechanisms, organizations may become "orphaned" or require backend database manipulation.
3. **Continuity**: Business continuity is compromised when ownership transitions aren't smooth and auditable.
4. **Compliance**: Many organizations require clear audit trails for administrative privilege changes.

## Decision Drivers

- **Security**: Prevent unauthorized transfers and maintain clear chain of custody
- **Auditability**: Complete audit trail of ownership changes with timestamps and justification
- **User Experience**: Simple, intuitive process for Super Users
- **Safety**: Multiple confirmation steps and rollback capability
- **Notification**: All affected parties must be notified of ownership changes
- **Compliance**: Meet organizational governance requirements for privilege transfers

## Considered Options

- **Option A: Single-Step Direct Transfer**: Super User selects new owner, confirms once, transfer happens immediately
- **Option B: Two-Factor Transfer with Acceptance**: Current owner initiates, new owner must accept
- **Option C: Multi-Stage Transfer with Cooling Period**: Initiate → Cooling Period → Accept → Complete
- **Option D: Admin-Only Backend Transfer**: Require system administrator intervention

## Decision Outcome

Chosen option: **Option B: Two-Factor Transfer with Acceptance**, because it balances security with usability. The new owner must explicitly accept ownership, preventing accidental or malicious transfers, while avoiding unnecessary complexity of cooling periods.

### Implementation Details

#### 1. Database Schema Changes

**New Table: `ownership_transfers`**
```sql
CREATE TABLE ownership_transfers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  initiated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  reason TEXT,
  cancellation_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

CREATE INDEX idx_ownership_transfers_org ON ownership_transfers(organization_id);
CREATE INDEX idx_ownership_transfers_status ON ownership_transfers(status);
CREATE INDEX idx_ownership_transfers_to_user ON ownership_transfers(to_user_id);
```

**New Table: `ownership_transfer_audit_log`**
```sql
CREATE TABLE ownership_transfer_audit_log (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('initiated', 'accepted', 'rejected', 'cancelled', 'expired')),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  metadata TEXT, -- JSON blob for additional context
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX idx_transfer_audit_transfer ON ownership_transfer_audit_log(transfer_id);
CREATE INDEX idx_transfer_audit_timestamp ON ownership_transfer_audit_log(timestamp);
```

#### 2. Transfer Workflow

**Step 1: Initiation (Current Super User)**
- Super User navigates to Organization Settings → Advanced → Transfer Ownership
- System displays warning modal with consequences:
  - "You will lose all Super User privileges"
  - "The new owner will have full administrative control"
  - "This action requires acceptance from the recipient"
- Super User selects new owner from:
  - Existing organization admins (recommended)
  - Existing organization members
  - New user via email invitation
- Super User provides reason for transfer (required, minimum 10 characters)
- Super User confirms with password re-authentication
- Transfer request created with 7-day expiration period
- Notifications sent to:
  - New owner (email + in-app)
  - All current Super Users (if multiple)
  - All organization admins

**Step 2: Review Period (New Owner)**
- New owner receives notification with:
  - Organization details
  - Current owner information
  - Reason for transfer
  - Consequences of acceptance
- New owner can:
  - **Accept**: Proceeds to Step 3
  - **Reject**: Transfer cancelled, current owner notified
  - **Ignore**: Transfer expires after 7 days

**Step 3: Acceptance (New Owner)**
- New owner reviews final confirmation modal:
  - "You will become the primary Super User"
  - "You will be responsible for all organization administration"
  - List of current permissions being granted
- New owner must acknowledge understanding checkbox
- New owner confirms with password re-authentication
- Transfer executes immediately upon confirmation

**Step 4: Completion (System)**
- Atomic database transaction:
  1. Update `users.role` for new owner to 'super_user'
  2. Update `users.role` for previous owner to configurable role (default: 'admin')
  3. Update `ownership_transfers.status` to 'accepted'
  4. Update `ownership_transfers.completed_at` to current timestamp
  5. Create audit log entries
- Send completion notifications to:
  - New owner (confirmation)
  - Previous owner (acknowledgment)
  - All organization admins
  - All organization members (optional, configurable)

#### 3. API Endpoints

**POST /api/organizations/:orgId/ownership/transfer**
- Initiates ownership transfer
- Body: `{ toUserId: string, reason: string }`
- Auth: Requires Super User role
- Returns: Transfer record

**GET /api/organizations/:orgId/ownership/transfers**
- Lists all transfers (active and historical) for organization
- Auth: Requires Super User or Admin role
- Query params: `status`, `limit`, `offset`
- Returns: Paginated transfer list

**GET /api/ownership/transfers/pending**
- Lists all pending transfers where current user is recipient
- Auth: Authenticated user
- Returns: List of transfers requiring user action

**POST /api/ownership/transfers/:transferId/accept**
- Accepts pending ownership transfer
- Auth: Must be the designated recipient
- Returns: Updated transfer record

**POST /api/ownership/transfers/:transferId/reject**
- Rejects pending ownership transfer
- Body: `{ reason: string }` (optional)
- Auth: Must be the designated recipient
- Returns: Updated transfer record

**POST /api/ownership/transfers/:transferId/cancel**
- Cancels pending ownership transfer
- Body: `{ reason: string }` (required)
- Auth: Must be the initiator or another Super User
- Returns: Updated transfer record

**GET /api/ownership/transfers/:transferId/audit-log**
- Retrieves complete audit trail for transfer
- Auth: Requires Super User or Admin role in organization
- Returns: Chronological list of all actions

#### 4. UI Components

**OrganizationSettings.tsx**
- New "Transfer Ownership" section in Advanced settings
- Gated behind `isSuperUser` permission check
- Warning badge indicating high-risk action

**TransferOwnershipModal.tsx**
- Multi-step modal with progress indicator
- Steps: Select User → Provide Reason → Confirm → Status
- Includes inline validation and confirmation checkboxes
- Password re-authentication requirement

**PendingTransferBanner.tsx**
- Persistent banner at top of dashboard for recipients
- Shows: organization name, initiator, time remaining
- Direct action buttons: Accept, Reject, View Details

**TransferHistoryPanel.tsx**
- Read-only historical view of all transfers
- Filterable by status and date range
- Each row expandable to show full audit trail

#### 5. Security Measures

**Validation Rules**
- Transfer can only be initiated by current Super User
- Recipient cannot be current Super User (self-transfer blocked)
- Only one pending transfer per organization at a time
- Transfer expires after 7 days if not accepted
- Password re-authentication required for both parties

**Rate Limiting**
- Maximum 3 transfer attempts per organization per 24 hours
- Maximum 5 rejections before requiring admin intervention

**Audit Requirements**
- Every action logged with: timestamp, actor, IP, user agent
- Complete audit trail preserved even after transfer completion
- Audit logs retained for minimum 2 years (configurable)

**Rollback Protection**
- No automatic rollback - requires new transfer in reverse
- Previous Super User maintains ability to initiate counter-transfer if they still have admin role
- Emergency recovery requires system administrator intervention

#### 6. Edge Cases and Handling

**Scenario: Recipient Has No Account**
- Allow email invitation as part of transfer
- Recipient must create account and verify email before accepting
- Transfer remains pending with extended 14-day expiration

**Scenario: Multiple Super Users**
- All co-Super Users notified of transfer
- Any Super User can cancel pending transfer
- Warning shown that organization will have multiple Super Users after completion

**Scenario: Recipient Declines or Lets Transfer Expire**
- Initiator receives notification
- Initiator can retry with same or different recipient
- Statistics tracked to identify users who repeatedly decline

**Scenario: Initiator Deleted Before Completion**
- Transfer automatically cancelled if initiator account deleted
- Audit log preserved with note of cancellation reason

**Scenario: Organization Deleted During Transfer**
- Transfer automatically cancelled
- No notification sent (org no longer exists)

**Scenario: Concurrent Transfer Attempts**
- Database constraint prevents multiple pending transfers
- Second attempt receives clear error message
- Option to cancel existing transfer and start new one

#### 7. Notification Templates

**Email: Transfer Initiated (to Recipient)**
```
Subject: You've been nominated as Super User for [Organization Name]

Hi [Recipient Name],

[Initiator Name] has nominated you to become the primary Super User for [Organization Name].

Reason: [Transfer Reason]

As Super User, you will have full administrative control over:
- Organization settings and branding
- User roles and permissions
- Department structure
- Data imports and exports

This transfer request will expire on [Expiration Date].

[Accept Transfer] [Reject Transfer] [View Details]
```

**Email: Transfer Completed (to Previous Owner)**
```
Subject: Ownership Transfer Complete for [Organization Name]

Hi [Previous Owner Name],

Ownership of [Organization Name] has been successfully transferred to [New Owner Name].

Your role has been changed to: [New Role]

You can still access the organization with your current permissions. If you believe this transfer was made in error, please contact [New Owner Name] or your system administrator.

Transfer Details:
- Completed: [Timestamp]
- New Super User: [New Owner Name]
- Reason: [Transfer Reason]

[View Full Audit Trail]
```

### Positive Consequences

- **Security**: Two-factor confirmation prevents unauthorized transfers
- **Transparency**: Complete audit trail for compliance and debugging
- **Flexibility**: Handles various scenarios (email invites, rejections, expirations)
- **User Control**: Both parties have agency in the process
- **Reversibility**: Can be undone through reverse transfer if needed

### Negative Consequences

- **Complexity**: More complex than single-click transfer
- **Delay**: 7-day waiting period if recipient doesn't respond immediately
- **Storage**: Additional database tables and audit logs
- **Maintenance**: Requires background job to handle expirations
- **User Confusion**: Some users may find two-step process confusing

## Pros and Cons of the Options

### Option A: Single-Step Direct Transfer

- **Good**, because it's simple and fast
- **Good**, because it requires minimal code changes
- **Bad**, because it's vulnerable to accidental clicks or malicious transfers
- **Bad**, because recipient has no say in accepting responsibility
- **Bad**, because no cooling-off period for reconsideration

### Option B: Two-Factor Transfer with Acceptance (Chosen)

- **Good**, because it requires explicit consent from both parties
- **Good**, because it provides clear audit trail
- **Good**, because it prevents most accidental transfers
- **Bad**, because it adds complexity to the UX
- **Bad**, because transfers can hang indefinitely if recipient doesn't respond

### Option C: Multi-Stage Transfer with Cooling Period

- **Good**, because it provides maximum safety against rushed decisions
- **Good**, because it allows time for organizational review
- **Bad**, because it dramatically slows down legitimate transfers
- **Bad**, because the complexity is excessive for most use cases
- **Bad**, because it frustrates users who need immediate transfer

### Option D: Admin-Only Backend Transfer

- **Good**, because it provides maximum control and oversight
- **Good**, because it prevents any user-initiated security risks
- **Bad**, because it requires manual intervention for routine operations
- **Bad**, because it doesn't scale as the system grows
- **Bad**, because it creates dependency on system administrators

## Migration Strategy

### Phase 1: Database Setup
1. Create `ownership_transfers` and `ownership_transfer_audit_log` tables
2. Add database migration with rollback capability
3. Seed any existing Super User changes as historical "legacy" transfers

### Phase 2: Backend Implementation
1. Implement transfer API endpoints with comprehensive validation
2. Add background job for handling expirations (runs daily)
3. Implement notification system (email + in-app)
4. Add rate limiting and security measures

### Phase 3: Frontend Implementation
1. Build transfer initiation UI in Organization Settings
2. Create pending transfer banner for recipients
3. Implement transfer history view
4. Add transfer acceptance/rejection modals

### Phase 4: Testing & Rollout
1. Comprehensive unit tests for all endpoints
2. Integration tests for complete transfer workflows
3. Manual QA of all edge cases
4. Soft launch to beta organizations
5. Monitor audit logs for issues
6. Full rollout to all organizations

## Monitoring and Metrics

**Key Metrics to Track**
- Number of transfers initiated per week/month
- Transfer acceptance rate
- Average time from initiation to completion
- Transfer rejection rate and reasons
- Transfer expiration rate
- Failed transfer attempts (with reasons)

**Alerts**
- Alert if transfer rejection rate exceeds 30%
- Alert if multiple failed transfers from same organization (potential attack)
- Alert if transfer expiration rate exceeds 50% (UX issue)

## Future Enhancements

**Potential Future Features**
- **Temporary Ownership**: Allow time-limited ownership transfers (e.g., vacation coverage)
- **Co-Ownership**: Support multiple Super Users with equal privileges
- **Delegation**: Allow Super Users to delegate specific permissions without full transfer
- **Scheduled Transfers**: Allow scheduling transfers for future date
- **External Approvals**: Require approval from external party (e.g., HR, Legal)

## Links

- Related ADRs: (To be created)
  - ADR-XXX: Role-Based Access Control
  - ADR-XXX: Audit Logging System
- Related Issues: (To be linked)
- Related Plans:
  - User management system
  - Notification system
  - Audit logging infrastructure

## Open Questions

1. Should we support transferring ownership to users outside the organization?
2. What should be the default role for the previous owner after transfer? (admin, member, custom)
3. Should we send notification to all organization members, or just admins?
4. Should there be a limit on how many times ownership can be transferred per year?
5. Should we implement a "transfer template" for organizations with specific requirements?
6. Should we allow "emergency transfers" that bypass the acceptance step for critical situations?
