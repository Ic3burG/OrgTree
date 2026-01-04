import db from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { createAuditLog } from './audit.service.js';

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function createUser(name, email, password, ipAddress = null, userAgent = null) {
  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.status = 400;
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const userId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', ?, ?)
  `).run(userId, name, email, passwordHash, now, now);

  const user = db.prepare(`
    SELECT id, name, email, role, created_at
    FROM users WHERE id = ?
  `).get(userId);

  // Generate access token
  const accessToken = generateToken(user);

  // Generate and store refresh token
  const refreshToken = generateRefreshToken();
  storeRefreshToken(userId, refreshToken, { ipAddress, userAgent });

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function loginUser(email, password, ipAddress = null, userAgent = null) {
  // Find user
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // Security: Log failed login attempt - user not found
    createAuditLog(
      null, // System-wide security event
      null, // No authenticated user yet
      'failed_login',
      'security',
      'login',
      {
        email,
        reason: 'user_not_found',
        ipAddress,
        timestamp: new Date().toISOString()
      }
    );
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    // Security: Log failed login attempt - invalid password
    createAuditLog(
      null, // System-wide security event
      { id: user.id, name: user.name, email: user.email }, // Attempted user
      'failed_login',
      'security',
      'login',
      {
        email,
        reason: 'invalid_password',
        ipAddress,
        timestamp: new Date().toISOString()
      }
    );
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  // Generate access token
  const accessToken = generateToken(user);

  // Generate and store refresh token
  const refreshToken = generateRefreshToken();
  const { expiresAt } = storeRefreshToken(user.id, refreshToken, { ipAddress, userAgent });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password === 1
    },
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function getUserById(id) {
  const user = db.prepare(`
    SELECT id, name, email, role, must_change_password, created_at
    FROM users WHERE id = ?
  `).get(id);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    createdAt: user.created_at
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// ============================================
// REFRESH TOKEN FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure 256-bit refresh token
 * @returns {string} Base64url-encoded 32-byte token
 */
export function generateRefreshToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a refresh token for secure storage
 * @param {string} token - The raw refresh token
 * @returns {string} SHA-256 hash of the token
 */
function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate expiration date for refresh token
 * @returns {string} ISO date string
 */
function getRefreshTokenExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiry.toISOString();
}

/**
 * Store a refresh token in the database
 * @param {string} userId - User ID
 * @param {string} token - Raw refresh token (will be hashed)
 * @param {object} metadata - Additional info (ip, device)
 * @returns {object} Token record info
 */
export function storeRefreshToken(userId, token, metadata = {}) {
  const id = randomUUID();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = getRefreshTokenExpiry();

  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, tokenHash, metadata.userAgent || null, metadata.ipAddress || null, expiresAt);

  return { id, expiresAt };
}

/**
 * Validate a refresh token and return associated user
 * @param {string} token - Raw refresh token
 * @returns {object|null} User data if valid, null otherwise
 */
export function validateRefreshToken(token) {
  const tokenHash = hashRefreshToken(token);

  const tokenRecord = db.prepare(`
    SELECT rt.*, u.id as userId, u.name, u.email, u.role, u.must_change_password
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token_hash = ?
      AND rt.expires_at > datetime('now')
      AND rt.revoked_at IS NULL
  `).get(tokenHash);

  if (!tokenRecord) {
    return null;
  }

  // Update last_used_at
  db.prepare(`
    UPDATE refresh_tokens SET last_used_at = datetime('now') WHERE token_hash = ?
  `).run(tokenHash);

  return {
    tokenId: tokenRecord.id,
    userId: tokenRecord.userId,
    name: tokenRecord.name,
    email: tokenRecord.email,
    role: tokenRecord.role,
    mustChangePassword: tokenRecord.must_change_password === 1
  };
}

/**
 * Revoke a specific refresh token (logout)
 * @param {string} token - Raw refresh token
 * @returns {boolean} True if revoked, false if not found
 */
export function revokeRefreshToken(token) {
  const tokenHash = hashRefreshToken(token);

  const result = db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(tokenHash);

  return result.changes > 0;
}

/**
 * Revoke all refresh tokens for a user (password change, security event)
 * @param {string} userId - User ID
 * @returns {number} Number of tokens revoked
 */
export function revokeAllUserTokens(userId) {
  const result = db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(userId);

  return result.changes;
}

/**
 * Rotate a refresh token (issue new one, invalidate old)
 * @param {string} oldToken - Current refresh token
 * @param {object} metadata - IP, user agent for new token
 * @returns {object|null} New tokens if valid, null if invalid
 */
export function rotateRefreshToken(oldToken, metadata = {}) {
  const userData = validateRefreshToken(oldToken);

  if (!userData) {
    return null;
  }

  // Revoke the old token
  revokeRefreshToken(oldToken);

  // Generate new tokens
  const newRefreshToken = generateRefreshToken();
  const newAccessToken = generateToken(userData);

  // Store new refresh token
  const { expiresAt } = storeRefreshToken(userData.userId, newRefreshToken, metadata);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt: expiresAt,
    user: {
      id: userData.userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      mustChangePassword: userData.mustChangePassword
    }
  };
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @returns {array} List of active sessions
 */
export function getUserSessions(userId) {
  const sessions = db.prepare(`
    SELECT
      id,
      device_info as deviceInfo,
      ip_address as ipAddress,
      created_at as createdAt,
      last_used_at as lastUsedAt
    FROM refresh_tokens
    WHERE user_id = ? AND revoked_at IS NULL AND expires_at > datetime('now')
    ORDER BY last_used_at DESC
  `).all(userId);

  return sessions;
}

/**
 * Revoke a specific session by ID
 * @param {string} sessionId - Session/token ID
 * @param {string} userId - User ID (for authorization)
 * @returns {boolean} True if revoked, false if not found
 */
export function revokeSession(sessionId, userId) {
  const result = db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE id = ? AND user_id = ? AND revoked_at IS NULL
  `).run(sessionId, userId);

  return result.changes > 0;
}

/**
 * Revoke all sessions except the current one
 * @param {string} userId - User ID
 * @param {string} currentToken - Current refresh token to keep
 * @returns {number} Number of sessions revoked
 */
export function revokeOtherSessions(userId, currentToken) {
  const currentHash = hashRefreshToken(currentToken);

  const result = db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE user_id = ? AND token_hash != ? AND revoked_at IS NULL
  `).run(userId, currentHash);

  return result.changes;
}

/**
 * Clean up expired and revoked tokens
 * @returns {number} Number of tokens deleted
 */
export function cleanupExpiredTokens() {
  // Delete tokens that are:
  // 1. Expired (past expires_at)
  // 2. Revoked more than 7 days ago (keep revoked tokens briefly for security analysis)
  const result = db.prepare(`
    DELETE FROM refresh_tokens
    WHERE expires_at < datetime('now')
       OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-7 days'))
  `).run();

  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired/revoked refresh tokens`);
  }

  return result.changes;
}
