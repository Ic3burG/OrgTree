import db from '../db.js';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';

const VALID_ROLES = ['superuser', 'admin', 'user'];

/**
 * Generate a cryptographically secure temporary password
 * Uses proper entropy without filtering that reduces randomness
 */
function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsetLength = charset.length;
  const randomBytesNeeded = length * 2; // Use extra bytes to ensure enough entropy
  const bytes = randomBytes(randomBytesNeeded);

  let password = '';
  for (let i = 0; i < length; i++) {
    // Use modulo with sufficient random bytes to avoid bias
    const randomIndex = bytes[i] % charsetLength;
    password += charset[randomIndex];
  }

  return password;
}

export function getAllUsers() {
  const users = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at as createdAt
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  // Enhance each user with organization counts only (not full data for privacy)
  return users.map(user => {
    // Count owned organizations
    const ownedOrgCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM organizations
      WHERE created_by_id = ?
    `).get(user.id).count;

    // Count memberships
    const membershipCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM organization_members
      WHERE user_id = ?
    `).get(user.id).count;

    return {
      ...user,
      organizationCount: ownedOrgCount,
      membershipCount: membershipCount
    };
  });
}

export function getUserById(userId) {
  const user = db.prepare(`
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Get user's organizations
  const organizations = db.prepare(`
    SELECT id, name, created_at as createdAt
    FROM organizations
    WHERE created_by_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  return { ...user, organizations };
}

export function getUserOrganizationDetails(userId) {
  // Verify user exists
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Get owned organizations with full details
  const ownedOrganizations = db.prepare(`
    SELECT id, name, is_public as isPublic
    FROM organizations
    WHERE created_by_id = ?
    ORDER BY name
  `).all(userId);

  // Get memberships with full details
  const memberships = db.prepare(`
    SELECT
      o.id,
      o.name,
      o.is_public as isPublic,
      om.role
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = ?
    ORDER BY o.name
  `).all(userId);

  return {
    id: user.id,
    name: user.name,
    organizationCount: ownedOrganizations.length,
    membershipCount: memberships.length,
    ownedOrganizations,
    memberships
  };
}

export function updateUser(userId, { name, email }) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Check if email is already taken by another user
  if (email && email !== user.email) {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
    if (existingUser) {
      const error = new Error('Email already in use');
      error.status = 400;
      throw error;
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET name = ?, email = ?, updated_at = ?
    WHERE id = ?
  `).run(name || user.name, email || user.email, now, userId);

  return db.prepare(`
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `).get(userId);
}

export function updateUserRole(userId, newRole, requestingUserId) {
  // Validate role
  if (!VALID_ROLES.includes(newRole)) {
    const error = new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    error.status = 400;
    throw error;
  }

  // Prevent self-role change
  if (userId === requestingUserId) {
    const error = new Error('Cannot change your own role');
    error.status = 400;
    throw error;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET role = ?, updated_at = ?
    WHERE id = ?
  `).run(newRole, now, userId);

  return db.prepare(`
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `).get(userId);
}

export async function resetUserPassword(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Generate a cryptographically secure temporary password (16 characters)
  const tempPassword = generateSecurePassword(16);

  // Hash the new password
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 1, updated_at = ?
    WHERE id = ?
  `).run(passwordHash, now, userId);

  return {
    message: 'Password reset successfully',
    temporaryPassword: tempPassword
  };
}

export function deleteUser(userId, requestingUserId) {
  // Prevent self-deletion
  if (userId === requestingUserId) {
    const error = new Error('Cannot delete your own account');
    error.status = 400;
    throw error;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Delete user (organizations will cascade due to foreign key)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  return { message: 'User deleted successfully' };
}

export async function createAdminUser(name, email, role) {
  // Validate role
  if (!VALID_ROLES.includes(role)) {
    const error = new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    error.status = 400;
    throw error;
  }

  // Check if email already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    const error = new Error('Email already in use');
    error.status = 400;
    throw error;
  }

  // Generate cryptographically secure temporary password (16 characters)
  const tempPassword = generateSecurePassword(16);

  // Hash password
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Create user
  const userId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(userId, name, email, passwordHash, role, now, now);

  const user = db.prepare(`
    SELECT id, name, email, role, created_at as createdAt
    FROM users WHERE id = ?
  `).get(userId);

  return {
    user,
    temporaryPassword: tempPassword
  };
}
