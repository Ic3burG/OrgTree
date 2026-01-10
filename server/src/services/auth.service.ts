import db from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { createAuditLog } from './audit.service.js';
import type {
  DatabaseUser,
  DatabaseRefreshToken,
  CreateUserResult,
  LoginResult,
  AppError,
} from '../types/index.js';

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function createUser(
  name: string,
  email: string,
  password: string,
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<CreateUserResult> {
  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | DatabaseUser
    | undefined;
  if (existingUser) {
    const error = new Error('Email already registered') as AppError;
    error.status = 400;
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const userId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', ?, ?)
  `
  ).run(userId, name, email, passwordHash, now, now);

  const user = db
    .prepare(
      `
    SELECT id, name, email, role, created_at
    FROM users WHERE id = ?
  `
    )
    .get(userId) as DatabaseUser;

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

export async function loginUser(
  email: string,
  password: string,
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<LoginResult> {
  // Find user
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | DatabaseUser
    | undefined;
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
        timestamp: new Date().toISOString(),
      }
    );
    const error = new Error('Invalid email or password') as AppError;
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
        timestamp: new Date().toISOString(),
      }
    );
    const error = new Error('Invalid email or password') as AppError;
    error.status = 401;
    throw error;
  }

  // Generate access token
  const accessToken = generateToken(user);

  // TODO: Uncomment when TOTP is fully implemented with database schema
  // Check if user has 2FA enabled
  // if (user.totp_enabled === 1) {
  //   // Return response indicating 2FA is required
  //   // Do not generate refresh token yet - wait for 2FA verification
  //   return {
  //     requiresTwoFactor: true,
  //     user,
  //     accessToken: '', // Not provided yet
  //     refreshToken: '', // Not provided yet
  //     expiresIn: 0,
  //     tempUserId: user.id, // For 2FA verification
  //   };
  // }

  // 2FA not enabled - proceed with normal login
  // Generate and store refresh token
  const refreshToken = generateRefreshToken();
  storeRefreshToken(user.id, refreshToken, { ipAddress, userAgent });

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function getUserById(id: string): Promise<DatabaseUser> {
  const user = db
    .prepare(
      `
    SELECT id, name, email, role, must_change_password, created_at
    FROM users WHERE id = ?
  `
    )
    .get(id) as DatabaseUser | undefined;

  if (!user) {
    const error = new Error('User not found') as AppError;
    error.status = 404;
    throw error;
  }

  return user;
}

export function generateToken(user: DatabaseUser): string {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// ============================================
// REFRESH TOKEN FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure 256-bit refresh token
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a refresh token for secure storage
 */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate expiration date for refresh token
 */
function getRefreshTokenExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiry.toISOString();
}

/**
 * Store a refresh token in the database
 */
export function storeRefreshToken(
  userId: string,
  token: string,
  metadata: { ipAddress?: string | null; userAgent?: string | null } = {}
): { id: string; expiresAt: string } {
  const id = randomUUID();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = getRefreshTokenExpiry();

  db.prepare(
    `
    INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(id, userId, tokenHash, metadata.userAgent || null, metadata.ipAddress || null, expiresAt);

  return { id, expiresAt };
}

interface ValidateRefreshTokenResult {
  tokenId: string;
  userId: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superuser';
  mustChangePassword: boolean;
}

/**
 * Validate a refresh token and return associated user
 */
export function validateRefreshToken(token: string): ValidateRefreshTokenResult | null {
  const tokenHash = hashRefreshToken(token);

  interface TokenRecordWithUser extends DatabaseRefreshToken {
    userId: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superuser';
    must_change_password: number;
  }

  const tokenRecord = db
    .prepare(
      `
    SELECT rt.*, u.id as userId, u.name, u.email, u.role, u.must_change_password
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token_hash = ?
      AND rt.expires_at > datetime('now')
      AND rt.revoked_at IS NULL
  `
    )
    .get(tokenHash) as TokenRecordWithUser | undefined;

  if (!tokenRecord) {
    return null;
  }

  // Update last_used_at
  db.prepare(
    `
    UPDATE refresh_tokens SET last_used_at = datetime('now') WHERE token_hash = ?
  `
  ).run(tokenHash);

  return {
    tokenId: tokenRecord.id,
    userId: tokenRecord.userId,
    name: tokenRecord.name,
    email: tokenRecord.email,
    role: tokenRecord.role,
    mustChangePassword: Boolean(tokenRecord.must_change_password),
  };
}

/**
 * Revoke a specific refresh token (logout)
 */
export function revokeRefreshToken(token: string): boolean {
  const tokenHash = hashRefreshToken(token);

  const result = db
    .prepare(
      `
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE token_hash = ? AND revoked_at IS NULL
  `
    )
    .run(tokenHash);

  return result.changes > 0;
}

/**
 * Revoke all refresh tokens for a user (password change, security event)
 */
export function revokeAllUserTokens(userId: string): number {
  const result = db
    .prepare(
      `
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE user_id = ? AND revoked_at IS NULL
  `
    )
    .run(userId);

  return result.changes;
}

interface RotateRefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: DatabaseUser;
}

/**
 * Rotate a refresh token (issue new one, invalidate old)
 */
export function rotateRefreshToken(
  oldToken: string,
  metadata: { ipAddress?: string | null; userAgent?: string | null } = {}
): RotateRefreshTokenResult | null {
  const userData = validateRefreshToken(oldToken);

  if (!userData) {
    return null;
  }

  // Revoke the old token
  revokeRefreshToken(oldToken);

  // Generate new tokens
  const newRefreshToken = generateRefreshToken();
  const newAccessToken = generateToken(userData as unknown as DatabaseUser);

  // Store new refresh token
  const { expiresAt } = storeRefreshToken(userData.userId, newRefreshToken, metadata);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt: expiresAt,
    user: userData as unknown as DatabaseUser,
  };
}

interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: string): SessionInfo[] {
  const sessions = db
    .prepare(
      `
    SELECT
      id,
      device_info as deviceInfo,
      ip_address as ipAddress,
      created_at as createdAt,
      last_used_at as lastUsedAt
    FROM refresh_tokens
    WHERE user_id = ? AND revoked_at IS NULL AND expires_at > datetime('now')
    ORDER BY last_used_at DESC
  `
    )
    .all(userId) as SessionInfo[];

  return sessions;
}

/**
 * Revoke a specific session by ID
 */
export function revokeSession(sessionId: string, userId: string): boolean {
  const result = db
    .prepare(
      `
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE id = ? AND user_id = ? AND revoked_at IS NULL
  `
    )
    .run(sessionId, userId);

  return result.changes > 0;
}

/**
 * Revoke all sessions except the current one
 */
export function revokeOtherSessions(userId: string, currentToken: string): number {
  const currentHash = hashRefreshToken(currentToken);

  const result = db
    .prepare(
      `
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE user_id = ? AND token_hash != ? AND revoked_at IS NULL
  `
    )
    .run(userId, currentHash);

  return result.changes;
}

/**
 * Clean up expired and revoked tokens
 */
export function cleanupExpiredTokens(): number {
  // Delete tokens that are:
  // 1. Expired (past expires_at)
  // 2. Revoked more than 7 days ago (keep revoked tokens briefly for security analysis)
  const result = db
    .prepare(
      `
    DELETE FROM refresh_tokens
    WHERE expires_at < datetime('now')
       OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-7 days'))
  `
    )
    .run();

  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired/revoked refresh tokens`);
  }

  return result.changes;
}
