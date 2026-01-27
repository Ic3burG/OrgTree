import db from '../db.js';
import { randomUUID } from 'crypto';
import { createAuditLog } from './audit.service.js';
import type {
  AppError,
  OwnershipTransfer,
  OwnershipTransferWithDetails,
  OwnershipTransferAuditLog,
} from '../types/index.js';
import { checkOrgAccess } from './member.service.js';
import {
  sendTransferInitiatedEmail,
  sendTransferAcceptedEmail,
  sendTransferRejectedEmail,
  sendTransferCancelledEmail,
} from './email.service.js';
import {
  emitTransferInitiated,
  emitTransferAccepted,
  emitTransferRejected,
  emitTransferCancelled,
} from './socket-events.service.js';

// ============================================================================
// Types
// ============================================================================

interface TransferFilters {
  status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  limit?: number;
  offset?: number;
}

interface OwnershipTransferRow {
  id: string;
  organization_id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  initiated_at: number;
  expires_at: number;
  completed_at: number | null;
  reason: string;
  cancellation_reason: string | null;
  created_at: number;
  updated_at: number;
}

interface OwnershipTransferWithDetailsRow extends OwnershipTransferRow {
  from_user_name: string;
  from_user_email: string;
  to_user_name: string;
  to_user_email: string;
  organization_name: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log an audit entry for ownership transfer actions
 */
function logAuditEntry(
  transferId: string,
  action: 'initiated' | 'accepted' | 'rejected' | 'cancelled' | 'expired',
  actorId: string,
  actorRole: string,
  metadata: Record<string, unknown> | null = null,
  ipAddress: string | null = null,
  userAgent: string | null = null
): void {
  const id = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  db.prepare(
    `
    INSERT INTO ownership_transfer_audit_log (
      id, transfer_id, action, actor_id, actor_role, metadata, ip_address, user_agent, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    transferId,
    action,
    actorId,
    actorRole,
    metadata ? JSON.stringify(metadata) : null,
    ipAddress,
    userAgent,
    timestamp
  );
}

function mapTransferRow(row: OwnershipTransferRow): OwnershipTransfer | undefined {
  if (!row) return undefined;
  return {
    ...row,
    organizationId: row.organization_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    initiatedAt: row.initiated_at
      ? new Date(row.initiated_at * 1000).toISOString()
      : new Date().toISOString(),
    expiresAt: row.expires_at
      ? new Date(row.expires_at * 1000).toISOString()
      : new Date().toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : null,
    createdAt: row.created_at
      ? new Date(row.created_at * 1000).toISOString()
      : new Date().toISOString(),
    updatedAt: row.updated_at
      ? new Date(row.updated_at * 1000).toISOString()
      : new Date().toISOString(),
    cancellationReason: row.cancellation_reason,
  };
}

function mapTransferWithDetailsRow(
  row: OwnershipTransferWithDetailsRow
): OwnershipTransferWithDetails | undefined {
  if (!row) return undefined;
  return {
    ...row,
    organizationId: row.organization_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    initiatedAt: row.initiated_at
      ? new Date(row.initiated_at * 1000).toISOString()
      : new Date().toISOString(),
    expiresAt: row.expires_at
      ? new Date(row.expires_at * 1000).toISOString()
      : new Date().toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : null,
    createdAt: row.created_at
      ? new Date(row.created_at * 1000).toISOString()
      : new Date().toISOString(),
    updatedAt: row.updated_at
      ? new Date(row.updated_at * 1000).toISOString()
      : new Date().toISOString(),
    cancellationReason: row.cancellation_reason,
  };
}

/**
 * Check if user is Owner for an organization
 */
function isOrgOwner(orgId: string, userId: string): boolean {
  const access = checkOrgAccess(orgId, userId);
  return access.role === 'owner' && access.isOwner;
}

/**
 * Get user's global role
 */
function getUserRole(userId: string): string | null {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as
    | { role: string }
    | undefined;
  return user?.role || null;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate transfer eligibility before initiating
 */
export function validateTransferEligibility(
  orgId: string,
  fromUserId: string,
  toUserId: string
): { valid: boolean; error?: string } {
  // Check if initiator is Organization Owner
  if (!isOrgOwner(orgId, fromUserId)) {
    return { valid: false, error: 'Only Organization Owners can initiate ownership transfers' };
  }

  // Check if transferring to self
  if (fromUserId === toUserId) {
    return { valid: false, error: 'Cannot transfer ownership to yourself' };
  }

  // Check if target user exists
  const toUser = db.prepare('SELECT id FROM users WHERE id = ?').get(toUserId) as
    | { id: string }
    | undefined;
  if (!toUser) {
    return { valid: false, error: 'Target user not found' };
  }

  // Check for existing pending transfer
  const existingTransfer = db
    .prepare(
      `
      SELECT id FROM ownership_transfers
      WHERE organization_id = ? AND status = 'pending'
    `
    )
    .get(orgId) as { id: string } | undefined;

  if (existingTransfer) {
    // Only one pending transfer allowed per organization at a time
    // This prevents race conditions and confusion about who the intended new owner is
    return { valid: false, error: 'A pending transfer already exists for this organization' };
  }

  return { valid: true };
}

// ============================================================================
// Transfer Operations
// ============================================================================

/**
 * Initiate an ownership transfer
 */
export function initiateTransfer(
  orgId: string,
  fromUserId: string,
  toUserId: string,
  reason: string,
  ipAddress: string | null = null,
  userAgent: string | null = null
): OwnershipTransfer {
  // Validate eligibility
  const validation = validateTransferEligibility(orgId, fromUserId, toUserId);
  if (!validation.valid) {
    const error = new Error(validation.error) as AppError;
    error.status = 400;
    throw error;
  }

  // Validate reason
  if (!reason || reason.trim().length < 10) {
    const error = new Error('Transfer reason must be at least 10 characters') as AppError;
    error.status = 400;
    throw error;
  }

  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 7 * 24 * 60 * 60; // 7 days from now

  // Insert transfer record
  db.prepare(
    `
    INSERT INTO ownership_transfers (
      id, organization_id, from_user_id, to_user_id, status,
      initiated_at, expires_at, reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(id, orgId, fromUserId, toUserId, 'pending', now, expiresAt, reason.trim(), now, now);

  // Log audit entry
  const actorRole = getUserRole(fromUserId) || 'unknown';
  logAuditEntry(
    id,
    'initiated',
    fromUserId,
    actorRole,
    { organizationId: orgId, toUserId, reason: reason.trim() },
    ipAddress,
    userAgent
  );

  // Create organization audit log
  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(orgId) as
    | { name: string }
    | undefined;
  const fromUser = db.prepare('SELECT name, email FROM users WHERE id = ?').get(fromUserId) as
    | { name: string; email: string }
    | undefined;
  const toUser = db.prepare('SELECT name, email FROM users WHERE id = ?').get(toUserId) as
    | { name: string; email: string }
    | undefined;

  if (org && fromUser && toUser) {
    createAuditLog(
      orgId,
      { id: fromUserId, name: fromUser.name, email: fromUser.email },
      'ownership_transfer_initiated',
      'organization',
      'ownership_transfer',
      {
        transferId: id,
        toUserId,
        toUserName: toUser.name,
        toUserEmail: toUser.email,
        reason: reason.trim(),
        expiresAt: new Date(expiresAt * 1000).toISOString(),
      }
    );

    // Send email notification to recipient
    sendTransferInitiatedEmail({
      to: toUser.email,
      recipientName: toUser.name,
      initiatorName: fromUser.name,
      orgName: org.name,
      transferId: id,
    }).catch(err => console.error('Failed to send initiated email:', err));

    // Emit socket event
    emitTransferInitiated(
      orgId,
      toUserId,
      {
        id,
        orgId,
        orgName: org.name,
        organizationId: orgId,
        fromUserId,
        toUserId,
        status: 'pending',
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        initiatorName: fromUser.name,
        recipientName: toUser.name,
      },
      { id: fromUserId, name: fromUser.name, email: fromUser.email }
    );
  }

  const row = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(id) as OwnershipTransferRow;
  return mapTransferRow(row) as OwnershipTransfer;
}

/**
 * Accept an ownership transfer (executes the transfer)
 */
export function acceptTransfer(
  transferId: string,
  userId: string,
  ipAddress: string | null = null,
  userAgent: string | null = null
): OwnershipTransfer {
  const row = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as OwnershipTransferRow;
  const transfer = mapTransferRow(row);

  if (!transfer) {
    const error = new Error('Transfer not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Verify user is the recipient
  if (transfer.toUserId !== userId) {
    const error = new Error('Only the designated recipient can accept this transfer') as AppError;
    error.status = 403;
    throw error;
  }

  // Verify status is pending
  if (transfer.status !== 'pending') {
    const error = new Error(
      `Transfer cannot be accepted. Current status: ${transfer.status}`
    ) as AppError;
    error.status = 400;
    throw error;
  }

  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  if (now > Math.floor(new Date(transfer.expiresAt).getTime() / 1000)) {
    // Auto-expire the transfer
    db.prepare(
      `
      UPDATE ownership_transfers
      SET status = 'expired', updated_at = ?
      WHERE id = ?
    `
    ).run(now, transferId);

    const error = new Error('This transfer has expired') as AppError;
    error.status = 400;
    throw error;
  }

  // Execute atomic ownership transfer to ensure data consistency
  // If any step fails, the entire transaction is rolled back
  db.transaction(() => {
    // 1. Update organization owner to the new user
    db.prepare(
      `
      UPDATE organizations
      SET created_by_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    ).run(transfer.toUserId, transfer.organizationId);

    // 2. Remove new owner from organization_members if they were a member (owner cannot be a 'member')
    db.prepare(
      `
      DELETE FROM organization_members
      WHERE organization_id = ? AND user_id = ?
    `
    ).run(transfer.organizationId, transfer.toUserId);

    // 3. Add previous owner as admin (prevent them from losing all access)
    // They are automatically demoted to admin role to assist with transition
    const memberId = randomUUID();
    const nowISO = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', ?, ?, ?)
    `
    ).run(
      memberId,
      transfer.organizationId,
      transfer.fromUserId,
      transfer.toUserId,
      nowISO,
      nowISO
    );

    // 4. Update transfer status
    db.prepare(
      `
      UPDATE ownership_transfers
      SET status = 'accepted', completed_at = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(now, now, transferId);
  })();

  // Log audit entry
  const actorRole = getUserRole(userId) || 'unknown';
  logAuditEntry(transferId, 'accepted', userId, actorRole, null, ipAddress, userAgent);

  // Create organization audit log
  const org = db
    .prepare('SELECT name FROM organizations WHERE id = ?')
    .get(transfer.organizationId) as { name: string } | undefined;
  const newOwner = db
    .prepare('SELECT name, email FROM users WHERE id = ?')
    .get(transfer.toUserId) as { name: string; email: string } | undefined;
  const prevOwner = db
    .prepare('SELECT name, email FROM users WHERE id = ?')
    .get(transfer.fromUserId) as { name: string; email: string } | undefined;

  if (org && newOwner && prevOwner) {
    createAuditLog(
      transfer.organizationId,
      { id: userId, name: newOwner.name, email: newOwner.email },
      'ownership_transfer_completed',
      'organization',
      'ownership_transfer',
      {
        transferId,
        previousOwnerId: transfer.fromUserId,
        previousOwnerName: prevOwner.name,
        newOwnerId: transfer.toUserId,
        newOwnerName: newOwner.name,
        reason: transfer.reason,
      }
    );

    // Send email notification to previous owner
    sendTransferAcceptedEmail({
      to: prevOwner.email,
      recipientName: prevOwner.name,
      initiatorName: newOwner.name,
      orgName: org.name,
      transferId,
    }).catch(err => console.error('Failed to send accepted email:', err));

    // Emit socket event
    emitTransferAccepted(
      transfer.organizationId,
      transfer.fromUserId,
      {
        id: transferId,
        orgId: transfer.organizationId,
        orgName: org.name,
        organizationId: transfer.organizationId,
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        status: 'accepted',
      },
      { id: userId, name: newOwner.name, email: newOwner.email }
    );
  }

  const finalRow = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as OwnershipTransferRow;
  return mapTransferRow(finalRow) as OwnershipTransfer;
}

/**
 * Reject an ownership transfer
 */
export function rejectTransfer(
  transferId: string,
  userId: string,
  reason: string | null = null,
  ipAddress: string | null = null,
  userAgent: string | null = null
): OwnershipTransfer {
  const row = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as OwnershipTransferRow;
  const transfer = mapTransferRow(row);

  if (!transfer) {
    const error = new Error('Transfer not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Verify user is the recipient
  if (transfer.toUserId !== userId) {
    const error = new Error('Only the designated recipient can reject this transfer') as AppError;
    error.status = 403;
    throw error;
  }

  // Verify status is pending
  if (transfer.status !== 'pending') {
    const error = new Error(
      `Transfer cannot be rejected. Current status: ${transfer.status}`
    ) as AppError;
    error.status = 400;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);

  // Update transfer status
  db.prepare(
    `
    UPDATE ownership_transfers
    SET status = 'rejected', completed_at = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(now, now, transferId);

  // Log audit entry
  const actorRole = getUserRole(userId) || 'unknown';
  logAuditEntry(
    transferId,
    'rejected',
    userId,
    actorRole,
    reason ? { reason } : null,
    ipAddress,
    userAgent
  );

  // Create organization audit log
  const org = db
    .prepare('SELECT name FROM organizations WHERE id = ?')
    .get(transfer.organizationId) as { name: string } | undefined;
  const recipient = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as
    | { name: string; email: string }
    | undefined;

  if (org && recipient) {
    createAuditLog(
      transfer.organizationId,
      { id: userId, name: recipient.name, email: recipient.email },
      'ownership_transfer_rejected',
      'organization',
      'ownership_transfer',
      {
        transferId,
        fromUserId: transfer.fromUserId,
        rejectionReason: reason,
      }
    );

    // Send email to initiator
    const initiator = db
      .prepare('SELECT name, email FROM users WHERE id = ?')
      .get(transfer.fromUserId) as { name: string; email: string } | undefined;

    if (initiator) {
      sendTransferRejectedEmail({
        to: initiator.email,
        recipientName: initiator.name,
        initiatorName: recipient.name,
        orgName: org.name,
        transferId,
        reason: reason || undefined,
      }).catch(err => console.error('Failed to send rejected email:', err));
    }

    // Emit socket event
    emitTransferRejected(
      transfer.organizationId,
      transfer.fromUserId,
      {
        id: transferId,
        orgId: transfer.organizationId,
        orgName: org.name,
        organizationId: transfer.organizationId,
        fromUserId: transfer.fromUserId,
        status: 'rejected',
        reason,
      },
      { id: userId, name: recipient.name, email: recipient.email }
    );
  }

  const finalRow = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as OwnershipTransferRow;
  return mapTransferRow(finalRow) as OwnershipTransfer;
}

/**
 * Cancel a pending ownership transfer
 */
export function cancelTransfer(
  transferId: string,
  userId: string,
  reason: string,
  ipAddress: string | null = null,
  userAgent: string | null = null
): OwnershipTransfer {
  const row = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as OwnershipTransferRow;
  const transfer = mapTransferRow(row);

  if (!transfer) {
    const error = new Error('Transfer not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Verify user is the initiator or an Organization Owner
  const isInitiator = transfer.fromUserId === userId;
  const isOwnerOfOrg = isOrgOwner(transfer.organizationId, userId);

  if (!isInitiator && !isOwnerOfOrg) {
    const error = new Error(
      'Only the initiator or an Organization Owner can cancel this transfer'
    ) as AppError;
    error.status = 403;
    throw error;
  }

  // Verify status is pending
  if (transfer.status !== 'pending') {
    // Transfers in terminal states (accepted, rejected, cancelled, expired) cannot be modified
    const error = new Error(
      `Transfer cannot be cancelled. Current status: ${transfer.status}`
    ) as AppError;
    error.status = 400;
    throw error;
  }

  // Validate reason
  if (!reason || reason.trim().length < 1) {
    const error = new Error('Cancellation reason is required') as AppError;
    error.status = 400;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);

  // Update transfer status
  db.prepare(
    `
    UPDATE ownership_transfers
    SET status = 'cancelled', cancellation_reason = ?, completed_at = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(reason.trim(), now, now, transferId);

  // Log audit entry
  const actorRole = getUserRole(userId) || 'unknown';
  logAuditEntry(
    transferId,
    'cancelled',
    userId,
    actorRole,
    { reason: reason.trim() },
    ipAddress,
    userAgent
  );

  // Create organization audit log
  const org = db
    .prepare('SELECT name FROM organizations WHERE id = ?')
    .get(transfer.organizationId) as { name: string } | undefined;
  const actor = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as
    | { name: string; email: string }
    | undefined;

  if (org && actor) {
    createAuditLog(
      transfer.organizationId,
      { id: userId, name: actor.name, email: actor.email },
      'ownership_transfer_cancelled',
      'organization',
      'ownership_transfer',
      {
        transferId,
        cancellationReason: reason.trim(),
        cancelledBy: userId,
      }
    );

    // Send email to recipient (if they weren't the one cancelling? No, recipient receives cancellation)
    // Actually, we should send to the other party.
    // If initiator cancelled, send to recipient.
    // If super user cancelled (who isn't initiator), send to recipient AND initiator?
    // RFC says: Transfer cancelled (to recipient)

    const recipient = db
      .prepare('SELECT name, email FROM users WHERE id = ?')
      .get(transfer.toUserId) as { name: string; email: string } | undefined;

    if (recipient) {
      sendTransferCancelledEmail({
        to: recipient.email,
        recipientName: recipient.name, // Recipient gets the email
        initiatorName: actor.name, // "Actor has cancelled..."
        orgName: org.name,
        transferId,
        reason: reason.trim(),
      }).catch(err => console.error('Failed to send cancelled email:', err));
    }

    // Emit socket event
    emitTransferCancelled(
      transfer.organizationId,
      transfer.toUserId,
      {
        id: transferId,
        orgId: transfer.organizationId,
        orgName: org.name,
        organizationId: transfer.organizationId,
        status: 'cancelled',
        reason,
      },
      { id: userId, name: actor.name, email: actor.email }
    );
  }

  const finalRow = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as OwnershipTransferRow;
  return mapTransferRow(finalRow) as OwnershipTransfer;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get transfer by ID with permission check
 */
export function getTransferById(transferId: string, userId: string): OwnershipTransferWithDetails {
  const result = db
    .prepare(
      `
      SELECT
        t.*,
        fu.name as from_user_name,
        fu.email as from_user_email,
        tu.name as to_user_name,
        tu.email as to_user_email,
        o.name as organization_name
      FROM ownership_transfers t
      JOIN users fu ON t.from_user_id = fu.id
      JOIN users tu ON t.to_user_id = tu.id
      JOIN organizations o ON t.organization_id = o.id
      WHERE t.id = ?
    `
    )
    .get(transferId) as OwnershipTransferWithDetailsRow;

  if (!result) {
    const error = new Error('Transfer not found') as AppError;
    error.status = 404;
    throw error;
  }

  const transfer = mapTransferWithDetailsRow(result);

  if (!transfer) {
    const error = new Error('Transfer data invalid') as AppError;
    error.status = 500;
    throw error;
  }

  // Verify user has permission to view (involved party or org admin)
  const isInvolved = transfer.fromUserId === userId || transfer.toUserId === userId;
  const access = checkOrgAccess(transfer.organizationId, userId);
  const hasOrgAccess = access.role === 'owner' || access.role === 'admin';

  if (!isInvolved && !hasOrgAccess) {
    const error = new Error('Insufficient permissions to view this transfer') as AppError;
    error.status = 403;
    throw error;
  }

  return transfer;
}

/**
 * List transfers for an organization
 */
export function listTransfers(
  orgId: string,
  userId: string,
  filters: TransferFilters = {}
): OwnershipTransferWithDetails[] {
  // Verify user has admin+ permission
  const access = checkOrgAccess(orgId, userId);
  if (access.role !== 'owner' && access.role !== 'admin') {
    const error = new Error('Insufficient permissions. Admin or Owner role required.') as AppError;
    error.status = 403;
    throw error;
  }

  const { status, limit = 20, offset = 0 } = filters;

  let query = `
    SELECT
      t.*,
      fu.name as from_user_name,
      fu.email as from_user_email,
      tu.name as to_user_name,
      tu.email as to_user_email,
      o.name as organization_name
    FROM ownership_transfers t
    JOIN users fu ON t.from_user_id = fu.id
    JOIN users tu ON t.to_user_id = tu.id
    JOIN organizations o ON t.organization_id = o.id
    WHERE t.organization_id = ?
  `;

  const params: (string | number)[] = [orgId];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = db.prepare(query).all(...params) as OwnershipTransferWithDetailsRow[];

  return results.map(row => mapTransferWithDetailsRow(row)) as OwnershipTransferWithDetails[];
}

/**
 * Get pending transfers for a user (where they are the recipient)
 */
export function getPendingTransfersForUser(userId: string): OwnershipTransferWithDetails[] {
  const rows = db
    .prepare(
      `
      SELECT
        t.*,
        fu.name as from_user_name,
        fu.email as from_user_email,
        tu.name as to_user_name,
        tu.email as to_user_email,
        o.name as organization_name
      FROM ownership_transfers t
      JOIN users fu ON t.from_user_id = fu.id
      JOIN users tu ON t.to_user_id = tu.id
      JOIN organizations o ON t.organization_id = o.id
      WHERE t.to_user_id = ? AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `
    )
    .all(userId) as OwnershipTransferWithDetailsRow[];

  return rows.map(row => mapTransferWithDetailsRow(row)) as OwnershipTransferWithDetails[];
}

/**
 * Get audit log for a transfer
 */
export function getAuditLog(transferId: string, userId: string): OwnershipTransferAuditLog[] {
  // First get the transfer to check permissions
  const transfer = getTransferById(transferId, userId);

  // Verify user has permission (org admin+ or involved party)
  const access = checkOrgAccess(transfer.organizationId, userId);
  const isInvolved = transfer.fromUserId === userId || transfer.toUserId === userId;
  const hasOrgAccess = access.role === 'owner' || access.role === 'admin';

  if (!isInvolved && !hasOrgAccess) {
    const error = new Error('Insufficient permissions to view audit log') as AppError;
    error.status = 403;
    throw error;
  }

  return db
    .prepare(
      `
      SELECT * FROM ownership_transfer_audit_log
      WHERE transfer_id = ?
      ORDER BY timestamp ASC
    `
    )
    .all(transferId) as OwnershipTransferAuditLog[];
}

/**
 * Expire old transfers (to be run by cron job)
 */
export function expireOldTransfers(): number {
  const now = Math.floor(Date.now() / 1000);

  // Find expired pending transfers
  const expiredTransfers = db
    .prepare(
      `
      SELECT id FROM ownership_transfers
      WHERE status = 'pending' AND expires_at < ?
    `
    )
    .all(now) as { id: string }[];

  if (expiredTransfers.length === 0) {
    return 0;
  }

  // Update status and log for each
  for (const transfer of expiredTransfers) {
    db.prepare(
      `
      UPDATE ownership_transfers
      SET status = 'expired', completed_at = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(now, now, transfer.id);

    // Log audit entry (system action)
    logAuditEntry(
      transfer.id,
      'expired',
      'system',
      'system',
      { reason: 'Auto-expired after 7 days' },
      null,
      null
    );
  }

  console.log(`Expired ${expiredTransfers.length} old transfer(s)`);
  return expiredTransfers.length;
}
