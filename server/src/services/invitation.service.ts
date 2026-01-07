import db from '../db.js';
import { randomUUID, randomBytes } from 'crypto';
import { requireOrgPermission } from './member.service.js';
import { sendInvitationEmail, isEmailConfigured } from './email.service.js';

/**
 * Generate a secure random token for invitations
 */
function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Create and send an invitation
 */
export async function createInvitation(orgId, email, role, invitedById) {
  // Verify inviter has admin permission
  requireOrgPermission(orgId, invitedById, 'admin');

  // Validate role
  const validRoles = ['viewer', 'editor', 'admin'];
  if (!validRoles.includes(role)) {
    const error = new Error('Invalid role. Must be: viewer, editor, or admin');
    error.status = 400;
    throw error;
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists with this email
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser) {
    // Check if they're already a member
    const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId);
    if (org.created_by_id === existingUser.id) {
      // Security: Use generic message to prevent email enumeration
      const error = new Error('Cannot send invitation to this email address');
      error.status = 400;
      throw error;
    }

    const existingMember = db
      .prepare('SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?')
      .get(orgId, existingUser.id);

    if (existingMember) {
      // Security: Use generic message to prevent email enumeration
      const error = new Error('Cannot send invitation to this email address');
      error.status = 400;
      throw error;
    }
  }

  // Check for existing pending invitation
  const existingInvitation = db
    .prepare(
      `
    SELECT id FROM invitations
    WHERE organization_id = ? AND email = ? AND status = 'pending'
  `
    )
    .get(orgId, normalizedEmail);

  if (existingInvitation) {
    const error = new Error('An invitation has already been sent to this email');
    error.status = 400;
    throw error;
  }

  // Get inviter and org info for the email
  const inviter = db.prepare('SELECT name FROM users WHERE id = ?').get(invitedById);
  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(orgId);

  // Create invitation
  const invitationId = randomUUID();
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  db.prepare(
    `
    INSERT INTO invitations (id, organization_id, email, role, token, invited_by_id, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `
  ).run(
    invitationId,
    orgId,
    normalizedEmail,
    role,
    token,
    invitedById,
    expiresAt.toISOString(),
    now.toISOString()
  );

  // Send invitation email
  const emailResult = await sendInvitationEmail({
    to: normalizedEmail,
    inviterName: inviter.name,
    orgName: org.name,
    role,
    token,
  });

  // Return invitation details
  return {
    id: invitationId,
    email: normalizedEmail,
    role,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    emailSent: emailResult.success,
    emailError: emailResult.error,
  };
}

/**
 * Get pending invitations for an organization
 */
export function getOrgInvitations(orgId, userId) {
  // Verify user has admin permission
  requireOrgPermission(orgId, userId, 'admin');

  return db
    .prepare(
      `
    SELECT
      i.id,
      i.email,
      i.role,
      i.status,
      i.expires_at as expiresAt,
      i.created_at as createdAt,
      u.name as invitedByName
    FROM invitations i
    JOIN users u ON i.invited_by_id = u.id
    WHERE i.organization_id = ? AND i.status = 'pending'
    ORDER BY i.created_at DESC
  `
    )
    .all(orgId);
}

/**
 * Cancel an invitation
 */
export function cancelInvitation(orgId, invitationId, userId) {
  // Verify user has admin permission
  requireOrgPermission(orgId, userId, 'admin');

  const invitation = db
    .prepare('SELECT id FROM invitations WHERE id = ? AND organization_id = ? AND status = ?')
    .get(invitationId, orgId, 'pending');

  if (!invitation) {
    const error = new Error('Invitation not found');
    error.status = 404;
    throw error;
  }

  db.prepare("UPDATE invitations SET status = 'cancelled' WHERE id = ?").run(invitationId);

  return { success: true };
}

/**
 * Get invitation by token (public - for accepting)
 */
export function getInvitationByToken(token) {
  const invitation = db
    .prepare(
      `
    SELECT
      i.id,
      i.organization_id as organizationId,
      i.role,
      i.status,
      i.expires_at as expiresAt,
      o.name as organizationName
    FROM invitations i
    JOIN organizations o ON i.organization_id = o.id
    WHERE i.token = ?
  `
    )
    .get(token);

  if (!invitation) {
    return null;
  }

  // Check if expired
  if (new Date(invitation.expiresAt) < new Date()) {
    return {
      organizationName: invitation.organizationName,
      role: invitation.role,
      status: 'expired',
      expiresAt: invitation.expiresAt,
    };
  }

  // Security: Minimize metadata disclosure
  // Don't expose: inviter name/email, internal IDs
  // Only return what's necessary for the recipient to make an informed decision
  return {
    organizationName: invitation.organizationName,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Accept an invitation
 */
export function acceptInvitation(token, userId) {
  const invitation = db
    .prepare(
      `
    SELECT
      i.id,
      i.organization_id,
      i.email,
      i.role,
      i.status,
      i.expires_at,
      i.invited_by_id
    FROM invitations i
    WHERE i.token = ?
  `
    )
    .get(token);

  if (!invitation) {
    const error = new Error('Invitation not found');
    error.status = 404;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error('This invitation has already been used or cancelled');
    error.status = 400;
    throw error;
  }

  if (new Date(invitation.expires_at) < new Date()) {
    const error = new Error('This invitation has expired');
    error.status = 400;
    throw error;
  }

  // Get the user's email
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  if (!user) {
    // Security: Generic message to prevent information disclosure
    const error = new Error('Unable to accept invitation');
    error.status = 403;
    throw error;
  }

  // Verify the email matches (case-insensitive)
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    // Security: Generic message to prevent email enumeration
    const error = new Error('Unable to accept invitation');
    error.status = 403;
    throw error;
  }

  // Check if already a member
  const existingMember = db
    .prepare('SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?')
    .get(invitation.organization_id, userId);

  if (existingMember) {
    // Already a member, just mark invitation as accepted
    db.prepare("UPDATE invitations SET status = 'accepted', accepted_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      invitation.id
    );
    return { success: true, alreadyMember: true };
  }

  // Check if user is owner
  const org = db
    .prepare('SELECT created_by_id FROM organizations WHERE id = ?')
    .get(invitation.organization_id);
  if (org.created_by_id === userId) {
    // Security: Generic message to prevent information disclosure
    const error = new Error('Unable to accept invitation');
    error.status = 400;
    throw error;
  }

  // Add as member
  const memberId = randomUUID();
  const now = new Date().toISOString();

  const insertResult = db
    .prepare(
      `
    INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      memberId,
      invitation.organization_id,
      userId,
      invitation.role,
      invitation.invited_by_id,
      now,
      now
    );

  if (insertResult.changes === 0) {
    const error = new Error('Failed to add member to organization');
    error.status = 500;
    throw error;
  }

  // Mark invitation as accepted
  const updateResult = db
    .prepare("UPDATE invitations SET status = 'accepted', accepted_at = ? WHERE id = ?")
    .run(now, invitation.id);

  if (updateResult.changes === 0) {
    const error = new Error('Failed to update invitation status');
    error.status = 500;
    throw error;
  }

  return {
    success: true,
    organizationId: invitation.organization_id,
    role: invitation.role,
  };
}

/**
 * Check if email service is available
 */
export { isEmailConfigured };
