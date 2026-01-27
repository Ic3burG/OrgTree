import db from '../db.js';
import { randomUUID } from 'crypto';
import { createAuditLog } from './audit.service.js';
import type { AppError } from '../types/index.js';
import { checkOrgAccess } from './member.service.js';

// ============================================================================
// Types
// ============================================================================

export interface OwnershipTransfer {
  id: string;
  organizationId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  initiatedAt: number;
  expiresAt: number;
  completedAt: number | null;
  reason: string;
  cancellationReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface OwnershipTransferWithDetails extends OwnershipTransfer {
  fromUserName: string;
  fromUserEmail: string;
  toUserName: string;
  toUserEmail: string;
  organizationName: string;
}

interface OwnershipTransferAuditLog {
  id: string;
  transferId: string;
  action: 'initiated' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  actorId: string;
  actorRole: string;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: number;
}

interface TransferFilters {
  status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  limit?: number;
  offset?: number;
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

/**
 * Check if user is Super User for an organization
 */
function isSuperUser(orgId: string, userId: string): boolean {
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
  // Check if initiator is Super User
  if (!isSuperUser(orgId, fromUserId)) {
    return { valid: false, error: 'Only Super Users can initiate ownership transfers' };
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
  }

  return db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(id) as OwnershipTransfer;
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
  const transfer = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as
    | OwnershipTransfer
    | undefined;

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
  if (now > transfer.expiresAt) {
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

  // Execute atomic ownership transfer
  db.transaction(() => {
    // 1. Update organization owner
    db.prepare(
      `
      UPDATE organizations
      SET created_by_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    ).run(transfer.toUserId, transfer.organizationId);

    // 2. Remove new owner from organization_members if they were a member
    db.prepare(
      `
      DELETE FROM organization_members
      WHERE organization_id = ? AND user_id = ?
    `
    ).run(transfer.organizationId, transfer.toUserId);

    // 3. Add previous owner as admin
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
  }

  return db
    .prepare('SELECT * FROM ownership_transfers WHERE id = ?')
    .get(transferId) as OwnershipTransfer;
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
  const transfer = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as
    | OwnershipTransfer
    | undefined;

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
  }

  return db
    .prepare('SELECT * FROM ownership_transfers WHERE id = ?')
    .get(transferId) as OwnershipTransfer;
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
  const transfer = db.prepare('SELECT * FROM ownership_transfers WHERE id = ?').get(transferId) as
    | OwnershipTransfer
    | undefined;

  if (!transfer) {
    const error = new Error('Transfer not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Verify user is the initiator or a Super User
  const isInitiator = transfer.fromUserId === userId;
  const isSuperUserOfOrg = isSuperUser(transfer.organizationId, userId);

  if (!isInitiator && !isSuperUserOfOrg) {
    const error = new Error(
      'Only the initiator or a Super User can cancel this transfer'
    ) as AppError;
    error.status = 403;
    throw error;
  }

  // Verify status is pending
  if (transfer.status !== 'pending') {
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
  }

  return db
    .prepare('SELECT * FROM ownership_transfers WHERE id = ?')
    .get(transferId) as OwnershipTransfer;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get transfer by ID with permission check
 */
export function getTransferById(transferId: string, userId: string): OwnershipTransferWithDetails {
  const transfer = db
    .prepare(
      `
      SELECT
        t.*,
        fu.name as fromUserName,
        fu.email as fromUserEmail,
        tu.name as toUserName,
        tu.email as toUserEmail,
        o.name as organizationName
      FROM ownership_transfers t
      JOIN users fu ON t.from_user_id = fu.id
      JOIN users tu ON t.to_user_id = tu.id
      JOIN organizations o ON t.organization_id = o.id
      WHERE t.id = ?
    `
    )
    .get(transferId) as OwnershipTransferWithDetails | undefined;

  if (!transfer) {
    const error = new Error('Transfer not found') as AppError;
    error.status = 404;
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
      fu.name as fromUserName,
      fu.email as fromUserEmail,
      tu.name as toUserName,
      tu.email as toUserEmail,
      o.name as organizationName
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

  return db.prepare(query).all(...params) as OwnershipTransferWithDetails[];
}

/**
 * Get pending transfers for a user (where they are the recipient)
 */
export function getPendingTransfersForUser(userId: string): OwnershipTransferWithDetails[] {
  return db
    .prepare(
      `
      SELECT
        t.*,
        fu.name as fromUserName,
        fu.email as fromUserEmail,
        tu.name as toUserName,
        tu.email as toUserEmail,
        o.name as organizationName
      FROM ownership_transfers t
      JOIN users fu ON t.from_user_id = fu.id
      JOIN users tu ON t.to_user_id = tu.id
      JOIN organizations o ON t.organization_id = o.id
      WHERE t.to_user_id = ? AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `
    )
    .all(userId) as OwnershipTransferWithDetails[];
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
