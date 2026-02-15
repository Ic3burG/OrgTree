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

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

/**
 * CSRF Token Service
 *
 * Implements Double Submit Cookie pattern with HMAC signing.
 *
 * Security Features:
 * - Cryptographically random tokens (128-bit)
 * - HMAC-SHA256 signing to prevent tampering
 * - Timing-safe comparison to prevent timing attacks
 * - Token rotation on each request
 *
 * Flow:
 * 1. Frontend requests CSRF token via GET /api/csrf-token
 * 2. Backend generates random token, signs it, returns both
 * 3. Backend sets signed token as httpOnly=false cookie
 * 4. Frontend stores token and sends it in X-CSRF-Token header
 * 5. Backend validates header token matches cookie token
 */

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(16).toString('base64url'); // 128 bits, URL-safe
}

/**
 * Sign a CSRF token with HMAC-SHA256
 */
export function signCsrfToken(token: string): string {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CSRF_SECRET or JWT_SECRET must be configured');
  }

  const signature = createHmac('sha256', secret).update(token).digest('base64url');

  return `${token}.${signature}`;
}

/**
 * Verify a signed CSRF token
 */
export function verifyCsrfToken(signedToken: string): boolean {
  if (!signedToken || typeof signedToken !== 'string') {
    return false;
  }

  const parts = signedToken.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [token, receivedSignature] = parts;

  if (!token || !receivedSignature) {
    return false;
  }

  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret).update(token).digest('base64url');

  // Timing-safe comparison to prevent timing attacks
  try {
    const receivedBuffer = Buffer.from(receivedSignature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Compare two CSRF tokens in a timing-safe manner
 */
export function compareCsrfTokens(token1: string, token2: string): boolean {
  if (!token1 || !token2 || typeof token1 !== 'string' || typeof token2 !== 'string') {
    return false;
  }

  if (token1.length !== token2.length) {
    return false;
  }

  try {
    const buffer1 = Buffer.from(token1, 'utf8');
    const buffer2 = Buffer.from(token2, 'utf8');
    return timingSafeEqual(buffer1, buffer2);
  } catch {
    return false;
  }
}

/**
 * Generate a new CSRF token pair (unsigned and signed)
 */
export function createCsrfTokenPair(): { token: string; signedToken: string } {
  const token = generateCsrfToken();
  const signedToken = signCsrfToken(token);
  return { token, signedToken };
}
