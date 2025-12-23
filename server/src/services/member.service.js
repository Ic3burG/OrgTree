import db from '../db.js';
import { randomUUID } from 'crypto';

/**
 * Check if user has access to organization and return their effective role
 * Owner always has 'owner' role (higher than admin)
 * Returns: { hasAccess: boolean, role: 'owner'|'admin'|'editor'|'viewer'|null, isOwner: boolean }
 */
export function checkOrgAccess(orgId, userId) {
  // Check if user is owner
  const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId);

  if (!org) {
    return { hasAccess: false, role: null, isOwner: false };
  }

  if (org.created_by_id === userId) {
    return { hasAccess: true, role: 'owner', isOwner: true };
  }

  // Check if user is a member
  const member = db.prepare(`
    SELECT role FROM organization_members
    WHERE organization_id = ? AND user_id = ?
  `).get(orgId, userId);

  if (!member) {
    return { hasAccess: false, role: null, isOwner: false };
  }

  return { hasAccess: true, role: member.role, isOwner: false };
}

/**
 * Verify user has minimum required permission level
 * Throws 403/404 errors if insufficient access
 * Permission hierarchy: owner > admin > editor > viewer
 */
export function requireOrgPermission(orgId, userId, minRole = 'viewer') {
  const access = checkOrgAccess(orgId, userId);

  if (!access.hasAccess) {
    const error = new Error('Organization not found');
    error.status = 404;
    throw error;
  }

  const roleHierarchy = { viewer: 0, editor: 1, admin: 2, owner: 3 };
  const userLevel = roleHierarchy[access.role];
  const requiredLevel = roleHierarchy[minRole];

  if (userLevel < requiredLevel) {
    const error = new Error('Insufficient permissions');
    error.status = 403;
    throw error;
  }

  return access; // Return access info for further use
}

/**
 * Get all members of an organization (excluding owner)
 * Returns members with user details
 */
export function getOrgMembers(orgId) {
  return db.prepare(`
    SELECT
      om.id,
      om.organization_id as organizationId,
      om.user_id as userId,
      om.role,
      om.created_at as createdAt,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organization_id = ?
    ORDER BY om.created_at DESC
  `).all(orgId);
}

/**
 * Add a member to organization
 * Only owner/admin can add members
 */
export function addOrgMember(orgId, userId, role, addedBy) {
  // Verify adder has admin permission
  requireOrgPermission(orgId, addedBy, 'admin');

  // Verify user exists
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Check if already a member or owner
  const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId);
  if (org.created_by_id === userId) {
    const error = new Error('User is already the owner of this organization');
    error.status = 400;
    throw error;
  }

  const existingMember = db.prepare(
    'SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?'
  ).get(orgId, userId);

  if (existingMember) {
    const error = new Error('User is already a member');
    error.status = 400;
    throw error;
  }

  // Add member
  const memberId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(memberId, orgId, userId, role, addedBy, now, now);

  // Return member with user details
  return db.prepare(`
    SELECT
      om.id,
      om.organization_id as organizationId,
      om.user_id as userId,
      om.role,
      om.created_at as createdAt,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.id = ?
  `).get(memberId);
}

/**
 * Update member role
 * Only owner/admin can change roles
 */
export function updateMemberRole(orgId, memberId, newRole, updatedBy) {
  // Verify updater has admin permission
  requireOrgPermission(orgId, updatedBy, 'admin');

  // Validate role
  const validRoles = ['viewer', 'editor', 'admin'];
  if (!validRoles.includes(newRole)) {
    const error = new Error('Invalid role. Must be: viewer, editor, or admin');
    error.status = 400;
    throw error;
  }

  const member = db.prepare(
    'SELECT * FROM organization_members WHERE id = ? AND organization_id = ?'
  ).get(memberId, orgId);

  if (!member) {
    const error = new Error('Member not found');
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE organization_members
    SET role = ?, updated_at = ?
    WHERE id = ?
  `).run(newRole, now, memberId);

  // Return updated member
  return db.prepare(`
    SELECT
      om.id,
      om.organization_id as organizationId,
      om.user_id as userId,
      om.role,
      om.created_at as createdAt,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.id = ?
  `).get(memberId);
}

/**
 * Remove member from organization
 * Only owner/admin can remove members
 */
export function removeOrgMember(orgId, memberId, removedBy) {
  // Verify remover has admin permission
  requireOrgPermission(orgId, removedBy, 'admin');

  const member = db.prepare(
    'SELECT * FROM organization_members WHERE id = ? AND organization_id = ?'
  ).get(memberId, orgId);

  if (!member) {
    const error = new Error('Member not found');
    error.status = 404;
    throw error;
  }

  db.prepare('DELETE FROM organization_members WHERE id = ?').run(memberId);

  return { success: true };
}

/**
 * Get all organizations accessible by a user (owned + member)
 */
export function getUserOrganizations(userId) {
  // Get owned organizations
  const ownedOrgs = db.prepare(`
    SELECT
      o.id,
      o.name,
      o.created_by_id as createdById,
      o.created_at as createdAt,
      o.updated_at as updatedAt,
      'owner' as role,
      (SELECT COUNT(*) FROM departments WHERE organization_id = o.id) as departmentCount
    FROM organizations o
    WHERE o.created_by_id = ?
  `).all(userId);

  // Get member organizations
  const memberOrgs = db.prepare(`
    SELECT
      o.id,
      o.name,
      o.created_by_id as createdById,
      o.created_at as createdAt,
      o.updated_at as updatedAt,
      om.role,
      (SELECT COUNT(*) FROM departments WHERE organization_id = o.id) as departmentCount
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = ?
  `).all(userId);

  // Combine and sort by created date
  const allOrgs = [...ownedOrgs, ...memberOrgs].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return allOrgs.map(org => ({
    ...org,
    departments: { length: org.departmentCount || 0 }
  }));
}
