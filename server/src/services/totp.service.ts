/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import db from '../db.js';
import type { AppError } from '../types/index.js';
import { randomBytes } from 'crypto';

interface TotpSetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Generate a new TOTP secret and QR code for a user
 */
export async function setupTotp(userId: string, userEmail: string): Promise<TotpSetupResult> {
  // Generate secret (20 bytes by default)
  const secret = generateSecret();

  // Generate OTP Auth URL for QR code
  const otpauth = generateURI({
    secret,
    label: userEmail,
    issuer: 'OrgTree',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  });

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(otpauth);

  // Generate backup codes (8 codes, 8 characters each)
  const backupCodes = generateBackupCodes(8);

  // Store secret in database (not enabled yet)
  db.prepare(`UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?`).run(secret, userId);

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
  const user = db.prepare('SELECT totp_secret FROM users WHERE id = ?').get(userId) as
    | { totp_secret: string | null }
    | undefined;

  if (!user || !user.totp_secret) {
    const error = new Error('2FA setup not started') as AppError;
    error.status = 400;
    throw error;
  }

  // Verify token
  try {
    const isValid = verifySync({
      token,
      secret: user.totp_secret,
      // window not supported in core verifySync?
      // Use standard settings (period=30 is default, but explicit is good)
      // If we want window, we might need to handle it manually or verify functional api spec
      // For now, removing window to fix build.
    });

    if (!isValid) {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // Silently fail verification errors
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
    .get(userId) as { totp_secret: string | null; totp_enabled: number } | undefined;

  if (!user || !user.totp_secret || !user.totp_enabled) {
    return false;
  }

  try {
    return !!verifySync({
      token,
      secret: user.totp_secret,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // Silently fail verification errors
    return false;
  }
}

// ...

/**
 * Generate backup codes for account recovery
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Security: Use crypto.randomBytes for cryptographically secure backup codes
    // Generate 6 random bytes and convert to hex string
    const code = randomBytes(6).toString('hex').toUpperCase().substring(0, 8);
    codes.push(code);
  }

  return codes;
}

/**
 * Generate a TOTP token (for testing purposes)
 */
export function generateTotpToken(secret: string): string {
  return generateSync({ secret });
}
