import db from '../db.js';
import { randomUUID } from 'crypto';
import { createAuditLog } from './audit.service.js';
import type { DatabaseUser, DatabaseOrgMember, AppError } from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

interface OrgAccessResult {
  hasAccess: boolean;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | null;
  isOwner: boolean;
}

interface OrgMemberWithUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  userName: string;
  userEmail: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface DatabaseOrgRecord {
  created_by_id: string;
}

interface DatabaseMemberRecord {
  role: 'admin' | 'editor' | 'viewer';
}

interface UserOrganization {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  departmentCount: number;
  departments: { length: number };
}

interface MemberQueryResult {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  userName: string;
  userEmail: string;
}

// ============================================================================
// Access Control Functions
// ============================================================================

/**
 * Check if user has access to organization and return their effective role
 * Owner always has 'owner' role (higher than admin)
 * Superusers always have 'owner' access
 * Returns: { hasAccess: boolean, role: 'owner'|'admin'|'editor'|'viewer'|null, isOwner: boolean }
 */
export function checkOrgAccess(orgId: string, userId: string): OrgAccessResult {
  // Check if user is owner
  const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId) as
    | DatabaseOrgRecord
    | undefined;

  // Check if user is superuser (Global Role)
  // This allows superusers to search/access any organization
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as
    | { role: string }
    | undefined;

  if (user?.role === 'superuser') {
    // console.log('[checkOrgAccess] User is superuser:', { orgId, userId });
    // Superusers have owner privileges, but for ownership transfer we need to know
    // if they are the actual creator/owner of the specific organization.
    return {
      hasAccess: true,
      role: 'owner',
      isOwner: org?.created_by_id === userId,
    };
  }

  if (!org) {
    console.error('[checkOrgAccess] Organization not found:', { orgId, userId });
    return { hasAccess: false, role: null, isOwner: false };
  }

  if (org.created_by_id === userId) {
    // console.log('[checkOrgAccess] User is owner:', { orgId, userId, role: 'owner' });
    return { hasAccess: true, role: 'owner', isOwner: true };
  }

  // Check if user is a member
  const member = db
    .prepare(
      `
    SELECT role FROM organization_members
    WHERE organization_id = ? AND user_id = ?
  `
    )
    .get(orgId, userId) as DatabaseMemberRecord | undefined;

  if (!member) {
    // console.error('[checkOrgAccess] User is not owner and not in organization_members:', {
    //   orgId,
    //   userId,
    //   ownerUserId: org.created_by_id,
    // });
    return { hasAccess: false, role: null, isOwner: false };
  }

  // console.log('[checkOrgAccess] User is member:', { orgId, userId, role: member.role });
  return { hasAccess: true, role: member.role, isOwner: false };
}

/**
 * Verify user has minimum required permission level
 * Throws 403/404 errors if insufficient access
 * Permission hierarchy: owner > admin > editor > viewer
 */
export function requireOrgPermission(
  orgId: string,
  userId: string,
  minRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'
): OrgAccessResult {
  const access = checkOrgAccess(orgId, userId);

  if (!access.hasAccess) {
    // Security: Log access attempt to non-existent or inaccessible org
    // console.warn(`[requireOrgPermission] Access Denied: User ${userId} has no access to org ${orgId}`);
    const error = new Error('Organization not found') as AppError;
    error.status = 404;
    throw error;
  }

  // System roles vs Org roles mapping
  const roleHierarchy: Record<string, number> = {
    viewer: 0,
    editor: 1,
    admin: 2,
    owner: 3,
    // Add defensive mapping for common issues
    user: 0,
    guest: -1,
  };

  const userLevel = roleHierarchy[access.role as string] ?? 0;
  const requiredLevel = roleHierarchy[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    // Security: Log permission denied - insufficient organization role
    console.warn(
      `[requireOrgPermission] Permission Denied: User ${userId} has effective role '${access.role}' (${userLevel}) but requires '${minRole}' (${requiredLevel}) for org ${orgId}`
    );

    // Get user details for logging
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) as
      | Pick<DatabaseUser, 'id' | 'name' | 'email' | 'role'>
      | undefined;

    createAuditLog(
      orgId, // Organization-specific security event
      user
        ? { id: user.id, name: user.name, email: user.email }
        : { id: userId, name: 'Unknown', email: '' },
      'permission_denied',
      'security',
      'organization_access',
      {
        organizationId: orgId,
        requiredRole: minRole,
        userRole: access.role,
        globalRole: user?.role, // Include global role for debugging
        userLevel,
        requiredLevel,
        timestamp: new Date().toISOString(),
      }
    );
    const error = new Error('Insufficient permissions') as AppError;
    error.status = 403;
    throw error;
  }

  return access; // Return access info for further use
}

// ============================================================================
// Member Management Functions
// ============================================================================

/**
 * Get all members of an organization (excluding owner)
 * Returns members with user details
 */
export function getOrgMembers(orgId: string): OrgMemberWithUser[] {
  const rows = db
    .prepare(
      `
    SELECT
      om.id,
      om.organization_id,
      om.user_id,
      om.role,
      om.created_at as joined_at,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organization_id = ?
    ORDER BY om.created_at DESC
  `
    )
    .all(orgId) as MemberQueryResult[];

  return rows.map(row => ({
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    userName: row.userName,
    userEmail: row.userEmail,
    user: {
      id: row.user_id,
      name: row.userName,
      email: row.userEmail,
    },
  }));
}

/**
 * Add a member to organization
 * Only owner/admin can add members
 */
export function addOrgMember(
  orgId: string,
  userId: string,
  role: 'admin' | 'editor' | 'viewer',
  addedBy: string
): OrgMemberWithUser {
  // Verify adder has admin permission
  requireOrgPermission(orgId, addedBy, 'admin');

  // Verify user exists
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId) as
    | Pick<DatabaseUser, 'id' | 'name' | 'email'>
    | undefined;
  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check if already a member or owner
  const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId) as
    | DatabaseOrgRecord
    | undefined;
  if (org && org.created_by_id === userId) {
    const error = new Error('User is already the owner of this organization') as AppError;
    error.status = 400;
    throw error;
  }

  const existingMember = db
    .prepare('SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?')
    .get(orgId, userId) as { id: string } | undefined;

  if (existingMember) {
    const error = new Error('User is already a member') as AppError;
    error.status = 400;
    throw error;
  }

  // Add member
  const memberId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(memberId, orgId, userId, role, addedBy, now, now);

  // Return member with user details
  const row = db
    .prepare(
      `
    SELECT
      om.id,
      om.organization_id,
      om.user_id,
      om.role,
      om.created_at as joined_at,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.id = ?
  `
    )
    .get(memberId) as MemberQueryResult;

  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    userName: row.userName,
    userEmail: row.userEmail,
    user: {
      id: row.user_id,
      name: row.userName,
      email: row.userEmail,
    },
  };
}

/**
 * Update member role
 * Only owner/admin can change roles
 */
export function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: 'admin' | 'editor' | 'viewer',
  updatedBy: string
): OrgMemberWithUser {
  // Verify updater has admin permission
  requireOrgPermission(orgId, updatedBy, 'admin');

  // Validate role
  const validRoles: string[] = ['viewer', 'editor', 'admin'];
  if (!validRoles.includes(newRole)) {
    const error = new Error('Invalid role. Must be: viewer, editor, or admin') as AppError;
    error.status = 400;
    throw error;
  }

  const member = db
    .prepare('SELECT * FROM organization_members WHERE id = ? AND organization_id = ?')
    .get(memberId, orgId) as DatabaseOrgMember | undefined;

  if (!member) {
    const error = new Error('Member not found') as AppError;
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE organization_members
    SET role = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(newRole, now, memberId);

  // Return updated member
  const row = db
    .prepare(
      `
    SELECT
      om.id,
      om.organization_id,
      om.user_id,
      om.role,
      om.created_at as joined_at,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.id = ?
  `
    )
    .get(memberId) as MemberQueryResult;

  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    userName: row.userName,
    userEmail: row.userEmail,
    user: {
      id: row.user_id,
      name: row.userName,
      email: row.userEmail,
    },
  };
}

/**
 * Remove member from organization
 * Only owner/admin can remove members
 */
export function removeOrgMember(
  orgId: string,
  memberId: string,
  removedBy: string
): { success: boolean } {
  // Verify remover has admin permission
  requireOrgPermission(orgId, removedBy, 'admin');

  const member = db
    .prepare('SELECT * FROM organization_members WHERE id = ? AND organization_id = ?')
    .get(memberId, orgId) as DatabaseOrgMember | undefined;

  if (!member) {
    const error = new Error('Member not found') as AppError;
    error.status = 404;
    throw error;
  }

  db.prepare('DELETE FROM organization_members WHERE id = ?').run(memberId);

  return { success: true };
}

/**
 * Add a member by email address
 * Returns { success: true, member } if user exists
 * Returns { success: false, error: 'user_not_found' } if user doesn't exist
 */
export function addMemberByEmail(
  orgId: string,
  email: string,
  role: 'admin' | 'editor' | 'viewer',
  addedBy: string
):
  | { success: true; member: OrgMemberWithUser }
  | { success: false; error: string; message: string } {
  // Verify adder has admin permission
  requireOrgPermission(orgId, addedBy, 'admin');

  // Validate role
  const validRoles: string[] = ['viewer', 'editor', 'admin'];
  if (!validRoles.includes(role)) {
    const error = new Error('Invalid role. Must be: viewer, editor, or admin') as AppError;
    error.status = 400;
    throw error;
  }

  // Find user by email
  const user = db
    .prepare('SELECT id, name, email FROM users WHERE email = ?')
    .get(email.toLowerCase().trim()) as Pick<DatabaseUser, 'id' | 'name' | 'email'> | undefined;

  if (!user) {
    return { success: false, error: 'user_not_found', message: 'No user with this email address' };
  }

  // Check if already a member or owner
  const org = db.prepare('SELECT created_by_id FROM organizations WHERE id = ?').get(orgId) as
    | DatabaseOrgRecord
    | undefined;
  if (org && org.created_by_id === user.id) {
    const error = new Error('This user is already the owner of this organization') as AppError;
    error.status = 400;
    throw error;
  }

  const existingMember = db
    .prepare('SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?')
    .get(orgId, user.id) as { id: string } | undefined;

  if (existingMember) {
    const error = new Error('This user is already a member') as AppError;
    error.status = 400;
    throw error;
  }

  // Add member
  const memberId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(memberId, orgId, user.id, role, addedBy, now, now);

  // Return member with user details
  const row = db
    .prepare(
      `
    SELECT
      om.id,
      om.organization_id,
      om.user_id,
      om.role,
      om.created_at as joined_at,
      u.name as userName,
      u.email as userEmail
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.id = ?
  `
    )
    .get(memberId) as MemberQueryResult;

  const member: OrgMemberWithUser = {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    userName: row.userName,
    userEmail: row.userEmail,
    user: {
      id: row.user_id,
      name: row.userName,
      email: row.userEmail,
    },
  };

  return { success: true, member };
}

/**
 * Get all organizations accessible by a user (owned + member)
 */
export function getUserOrganizations(userId: string): UserOrganization[] {
  interface OrgQueryResult {
    id: string;
    name: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    departmentCount: number;
  }

  // Get owned organizations
  const ownedOrgs = db
    .prepare(
      `
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
  `
    )
    .all(userId) as OrgQueryResult[];

  // Get member organizations (exclude owned to avoid duplicates)
  const memberOrgs = db
    .prepare(
      `
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
    WHERE om.user_id = ? AND o.created_by_id != ?
  `
    )
    .all(userId, userId) as OrgQueryResult[];

  // Combine and sort by created date
  const allOrgs = [...ownedOrgs, ...memberOrgs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allOrgs.map(
    (org): UserOrganization => ({
      ...org,
      departments: { length: org.departmentCount || 0 },
    })
  );
}
