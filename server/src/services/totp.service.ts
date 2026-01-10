import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import db from '../db.js';
import type { AppError } from '../types/index.js';

// Configure TOTP settings
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
  step: 30, // 30 second time step
};

interface TotpSetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Generate a new TOTP secret and QR code for a user
 */
export async function setupTotp(userId: string, userEmail: string): Promise<TotpSetupResult> {
  // Generate secret
  const secret = authenticator.generateSecret();

  // Generate OTP Auth URL for QR code
  const otpauth = authenticator.keyuri(userEmail, 'OrgTree', secret);

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(otpauth);

  // Generate backup codes (8 codes, 8 characters each)
  const backupCodes = generateBackupCodes(8);

  // Store secret in database (not enabled yet)
  db.prepare(
    `UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?`
  ).run(secret, userId);

  return {
    secret,
    qrCode,
    backupCodes,
  };
}

/**
 * Verify TOTP token and enable 2FA for user
 */
export function verifyAndEnableTotp(userId: string, token: string): boolean {
  const user = db
    .prepare('SELECT totp_secret FROM users WHERE id = ?')
    .get(userId) as { totp_secret: string | null } | undefined;

  if (!user || !user.totp_secret) {
    const error = new Error('2FA setup not started') as AppError;
    error.status = 400;
    throw error;
  }

  // Verify token
  const isValid = authenticator.verify({
    token,
    secret: user.totp_secret,
  });

  if (!isValid) {
    return false;
  }

  // Enable 2FA
  db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(userId);

  return true;
}

/**
 * Verify TOTP token for login
 */
export function verifyTotp(userId: string, token: string): boolean {
  const user = db
    .prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
    .get(userId) as
    | { totp_secret: string | null; totp_enabled: number }
    | undefined;

  if (!user || !user.totp_secret || !user.totp_enabled) {
    return false;
  }

  return authenticator.verify({
    token,
    secret: user.totp_secret,
  });
}

/**
 * Disable 2FA for a user
 */
export function disableTotp(userId: string): void {
  db.prepare(
    `UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?`
  ).run(userId);
}

/**
 * Check if user has 2FA enabled
 */
export function isTotpEnabled(userId: string): boolean {
  const user = db
    .prepare('SELECT totp_enabled FROM users WHERE id = ?')
    .get(userId) as { totp_enabled: number } | undefined;

  return user ? user.totp_enabled === 1 : false;
}

/**
 * Generate backup codes for account recovery
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Generate a TOTP token (for testing purposes)
 */
export function generateTotpToken(secret: string): string {
  return authenticator.generate(secret);
}
