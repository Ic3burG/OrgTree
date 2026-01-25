import db from '../db.js';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import type { DatabaseUser, AppError } from '../types/index.js';

const VALID_ROLES = ['superuser', 'admin', 'user'] as const;
type UserRole = (typeof VALID_ROLES)[number];

/**
 * Generate a cryptographically secure temporary password
 * Uses full entropy from crypto.randomBytes without filtering
 */
function generateSecurePassword(length: number = 16): string {
  // Use base62 encoding (alphanumeric: 0-9, A-Z, a-z) for maximum entropy
  // Each random byte gives us ~8 bits of entropy
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsetLength = charset.length;

  // Generate enough random bytes (1 byte per character is sufficient)
  const randomBytesBuffer = randomBytes(length);

  // Map each byte to a character in our charset
  let password = '';
  for (let i = 0; i < length; i++) {
    // Use modulo to map byte value (0-255) to charset index (0-61)
    const byteValue = randomBytesBuffer[i];
    if (byteValue !== undefined) {
      password += charset[byteValue % charsetLength];
    }
  }

  return password;
}

interface UserWithCounts {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superuser';
  createdAt: string;
  organizationCount: number;
  membershipCount: number;
}

interface OrgSummary {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
}

interface MembershipSummary {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superuser';
  createdAt: string;
  ownedOrganizations: OrgSummary[];
  memberships: MembershipSummary[];
  organizationCount: number;
  membershipCount: number;
}

interface UpdatedUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superuser';
  createdAt: string;
}

export function getAllUsers(): UserWithCounts[] {
  const users = db
    .prepare(
      `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at as createdAt
    FROM users u
    ORDER BY u.created_at DESC
  `
    )
    .all() as Array<{
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superuser';
    createdAt: string;
  }>;

  // Security: Only return counts, not detailed organization data
  // Detailed data available via getUserById if needed
  return users.map(user => {
    // Count owned organizations
    const ownedCount = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM organizations
      WHERE created_by_id = ?
    `
      )
      .get(user.id) as { count: number };

    // Count memberships
    const membershipCount = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM organization_members
      WHERE user_id = ?
    `
      )
      .get(user.id) as { count: number };

    return {
      ...user,
      organizationCount: ownedCount.count,
      membershipCount: membershipCount.count,
    };
  });
}

export function getUserById(userId: string): UserWithDetails {
  const user = db
    .prepare(
      `
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `
    )
    .get(userId) as
    | {
        id: string;
        name: string;
        email: string;
        role: 'user' | 'admin' | 'superuser';
        createdAt: string;
      }
    | undefined;

  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Get owned organizations with full details
  const ownedOrganizations = db
    .prepare(
      `
    SELECT id, name, is_public as isPublic, created_at as createdAt
    FROM organizations
    WHERE created_by_id = ?
    ORDER BY name
  `
    )
    .all(userId) as Array<{
    id: string;
    name: string;
    isPublic: number;
    createdAt: string;
  }>;

  // Get memberships with full details
  const memberships = db
    .prepare(
      `
    SELECT
      o.id,
      o.name,
      o.is_public as isPublic,
      o.created_at as createdAt,
      om.role,
      om.created_at as joinedAt
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = ?
    ORDER BY o.name
  `
    )
    .all(userId) as Array<{
    id: string;
    name: string;
    isPublic: number;
    createdAt: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    joinedAt: string;
  }>;

  return {
    ...user,
    ownedOrganizations: ownedOrganizations.map(org => ({
      id: org.id,
      name: org.name,
      isPublic: Boolean(org.isPublic),
      createdAt: org.createdAt,
    })),
    memberships: memberships.map(m => ({
      id: m.id,
      name: m.name,
      isPublic: Boolean(m.isPublic),
      createdAt: m.createdAt,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    organizationCount: ownedOrganizations.length,
    membershipCount: memberships.length,
  };
}

export function updateUser(
  userId: string,
  { name, email, is_discoverable }: { name?: string; email?: string; is_discoverable?: boolean }
): UpdatedUser {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | (DatabaseUser & { is_discoverable: number })
    | undefined;
  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check if email is already taken by another user
  if (email && email !== user.email) {
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(email, userId) as { id: string } | undefined;
    if (existingUser) {
      const error = new Error('Email already in use') as AppError;
      error.status = 400;
      throw error;
    }
  }

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE users
    SET name = ?, email = ?, is_discoverable = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(
    name !== undefined ? name : user.name,
    email !== undefined ? email : user.email,
    is_discoverable !== undefined ? (is_discoverable ? 1 : 0) : user.is_discoverable,
    now,
    userId
  );

  return db
    .prepare(
      `
    SELECT id, name, email, role, created_at as createdAt, is_discoverable
    FROM users WHERE id = ?
  `
    )
    .get(userId) as UpdatedUser;
}

export function searchUsers(query: string, limit: number = 5): UpdatedUser[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;

  return db
    .prepare(
      `
    SELECT id, name, email, role, created_at as createdAt
    FROM users
    WHERE is_discoverable = 1
      AND (name LIKE ? OR email LIKE ?)
    LIMIT ?
  `
    )
    .all(searchTerm, searchTerm, limit) as UpdatedUser[];
}

export function updateUserRole(
  userId: string,
  newRole: UserRole,
  requestingUserId: string
): UpdatedUser {
  // Validate role
  if (!VALID_ROLES.includes(newRole)) {
    const error = new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`) as AppError;
    error.status = 400;
    throw error;
  }

  // Prevent self-role change
  if (userId === requestingUserId) {
    const error = new Error('Cannot change your own role') as AppError;
    error.status = 400;
    throw error;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | DatabaseUser
    | undefined;
  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE users
    SET role = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(newRole, now, userId);

  return db
    .prepare(
      `
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `
    )
    .get(userId) as UpdatedUser;
}

export async function resetUserPassword(
  userId: string
): Promise<{ message: string; temporaryPassword: string }> {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | DatabaseUser
    | undefined;
  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Security: Generate cryptographically secure temporary password (16 chars, full entropy)
  const tempPassword = generateSecurePassword(16);

  // Hash the new password
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE users
    SET password_hash = ?, must_change_password = 1, updated_at = ?
    WHERE id = ?
  `
  ).run(passwordHash, now, userId);

  return {
    message: 'Password reset successfully',
    temporaryPassword: tempPassword,
  };
}

export function deleteUser(userId: string, requestingUserId: string): { message: string } {
  // Prevent self-deletion
  if (userId === requestingUserId) {
    const error = new Error('Cannot delete your own account') as AppError;
    error.status = 400;
    throw error;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | DatabaseUser
    | undefined;
  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Delete user (organizations will cascade due to foreign key)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  return { message: 'User deleted successfully' };
}

export async function createAdminUser(
  name: string,
  email: string,
  role: UserRole
): Promise<{ user: UpdatedUser; temporaryPassword: string }> {
  // Validate role
  if (!VALID_ROLES.includes(role)) {
    const error = new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`) as AppError;
    error.status = 400;
    throw error;
  }

  // Check if email already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
    | { id: string }
    | undefined;
  if (existingUser) {
    const error = new Error('Email already in use') as AppError;
    error.status = 400;
    throw error;
  }

  // Security: Generate cryptographically secure temporary password (16 chars, full entropy)
  const tempPassword = generateSecurePassword(16);

  // Hash password
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Create user
  const userId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO users (id, name, email, password_hash, role, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `
  ).run(userId, name, email, passwordHash, role, now, now);

  const user = db
    .prepare(
      `
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `
    )
    .get(userId) as UpdatedUser;

  return {
    user,
    temporaryPassword: tempPassword,
  };
}
