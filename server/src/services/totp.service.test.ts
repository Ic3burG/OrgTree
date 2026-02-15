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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

// Mock the database module before importing the service
vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db: DatabaseType = new Database(':memory:');

  // Initialize schema with users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return { default: db };
});

// Import after mocking
import db from '../db.js';
import { setupTotp, verifyAndEnableTotp, verifyTotp, generateTotpToken } from './totp.service.js';

describe('TOTP Service', () => {
  const testUserId = 'test-user-id';
  const testUserEmail = 'test@example.com';

  beforeEach(() => {
    // Clear and seed users table
    (db as DatabaseType).prepare('DELETE FROM users').run();
    (db as DatabaseType)
      .prepare(
        `INSERT INTO users (id, name, email, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(testUserId, 'Test User', testUserEmail, 'hashedpassword', 'user');
  });

  describe('setupTotp', () => {
    it('should generate TOTP secret and QR code', async () => {
      const result = await setupTotp(testUserId, testUserEmail);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');

      // Secret should be a non-empty string
      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(0);

      // QR code should be a data URL
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate 8 backup codes', async () => {
      const result = await setupTotp(testUserId, testUserEmail);

      expect(result.backupCodes).toHaveLength(8);
      result.backupCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]+$/);
        expect(code.length).toBe(8);
      });
    });

    it('should store secret in database with totp_enabled = 0', async () => {
      const result = await setupTotp(testUserId, testUserEmail);

      const user = (db as DatabaseType)
        .prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
        .get(testUserId) as { totp_secret: string; totp_enabled: number };

      expect(user.totp_secret).toBe(result.secret);
      expect(user.totp_enabled).toBe(0);
    });

    it('should generate unique secrets for different users', async () => {
      // Add second user
      (db as DatabaseType)
        .prepare(
          `INSERT INTO users (id, name, email, password_hash, role) 
           VALUES (?, ?, ?, ?, ?)`
        )
        .run('user-2', 'User Two', 'user2@example.com', 'hash', 'user');

      const result1 = await setupTotp(testUserId, testUserEmail);
      const result2 = await setupTotp('user-2', 'user2@example.com');

      expect(result1.secret).not.toBe(result2.secret);
    });
  });

  describe('verifyAndEnableTotp', () => {
    it('should throw error if TOTP setup not started', () => {
      expect(() => verifyAndEnableTotp(testUserId, '123456')).toThrow('2FA setup not started');
    });

    it('should return false for invalid token', async () => {
      await setupTotp(testUserId, testUserEmail);

      // Use a non-numeric string that will definitely fail TOTP validation
      const result = verifyAndEnableTotp(testUserId, 'INVALID');

      expect(result).toBe(false);
    });

    it('should return true and enable TOTP for valid token', async () => {
      const setup = await setupTotp(testUserId, testUserEmail);

      // Generate a valid token using the secret
      const validToken = generateTotpToken(setup.secret);

      const result = verifyAndEnableTotp(testUserId, validToken);

      expect(result).toBe(true);

      // Verify totp_enabled is set to 1
      const user = (db as DatabaseType)
        .prepare('SELECT totp_enabled FROM users WHERE id = ?')
        .get(testUserId) as { totp_enabled: number };

      expect(user.totp_enabled).toBe(1);
    });

    it('should throw error with status 400 for non-existent user', () => {
      try {
        verifyAndEnableTotp('non-existent', '123456');
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toBe('2FA setup not started');
        expect((err as { status: number }).status).toBe(400);
      }
    });
  });

  describe('verifyTotp', () => {
    it('should return false if user has no TOTP secret', () => {
      const result = verifyTotp(testUserId, '123456');
      expect(result).toBe(false);
    });

    it('should return false if TOTP is not enabled', async () => {
      // Setup TOTP but don't enable it
      const setup = await setupTotp(testUserId, testUserEmail);
      const validToken = generateTotpToken(setup.secret);

      const result = verifyTotp(testUserId, validToken);

      expect(result).toBe(false);
    });

    it('should return false for invalid token when enabled', async () => {
      // Setup and enable TOTP
      const setup = await setupTotp(testUserId, testUserEmail);
      const validToken = generateTotpToken(setup.secret);
      verifyAndEnableTotp(testUserId, validToken);

      // Use a non-numeric string that will definitely fail TOTP validation
      const result = verifyTotp(testUserId, 'INVALID');

      expect(result).toBe(false);
    });

    it('should return true for valid token when enabled', async () => {
      // Setup and enable TOTP
      const setup = await setupTotp(testUserId, testUserEmail);
      const validToken = generateTotpToken(setup.secret);
      verifyAndEnableTotp(testUserId, validToken);

      // Generate fresh token for verification
      const freshToken = generateTotpToken(setup.secret);
      const result = verifyTotp(testUserId, freshToken);

      expect(result).toBe(true);
    });

    it('should return false for non-existent user', () => {
      const result = verifyTotp('non-existent', '123456');
      expect(result).toBe(false);
    });
  });

  describe('generateTotpToken', () => {
    it('should generate a 6-digit token', async () => {
      const setup = await setupTotp(testUserId, testUserEmail);
      const token = generateTotpToken(setup.secret);

      expect(token).toMatch(/^\d{6}$/);
    });

    it('should generate same token for same secret within time window', async () => {
      // Use a real secret from setupTotp which generates proper-length secrets
      const setup = await setupTotp(testUserId, testUserEmail);

      const token1 = generateTotpToken(setup.secret);
      const token2 = generateTotpToken(setup.secret);

      expect(token1).toBe(token2);
    });

    it('should generate tokens that pass verification', async () => {
      const setup = await setupTotp(testUserId, testUserEmail);
      const token = generateTotpToken(setup.secret);

      // Enable TOTP first
      verifyAndEnableTotp(testUserId, token);

      // Fresh token should verify
      const freshToken = generateTotpToken(setup.secret);
      const result = verifyTotp(testUserId, freshToken);

      expect(result).toBe(true);
    });
  });
});
