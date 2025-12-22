import db from '../db.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const VALID_ROLES = ['superuser', 'admin', 'user'];

export function getAllUsers() {
  const users = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at as createdAt,
      (SELECT COUNT(*) FROM organizations WHERE created_by_id = u.id) as organizationCount
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  return users;
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

  // Generate a random temporary password (12 characters, alphanumeric)
  const tempPassword = randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

  // Hash the new password
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = ?
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
