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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { initializeDatabase } from './db-init.js';

// Mock migrations to prevent race conditions with discovery.test.ts
vi.mock('./migrations/index.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./migrations/index.js')>();
  return {
    ...actual,
    discoverMigrations: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('./migrations/legacy-migrations.js', async importOriginal => {
  // We want the REAL legacy migrations to run so tables are created
  return await importOriginal();
});

describe('Database Initialization', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('should create all required tables', async () => {
    await initializeDatabase(db);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];
    const tableNames = tables.map(t => t.name);

    const requiredTables = [
      'users',
      'organizations',
      'departments',
      'people',
      'audit_logs',
      'analytics_events',
      'custom_field_definitions',
      'custom_field_values',
      'passkeys',
      'refresh_tokens',
      'invitations',
      'organization_members',
      '_migrations',
    ];

    requiredTables.forEach(table => {
      expect(tableNames).toContain(table);
    });
  });

  it('should create FTS virtual tables', async () => {
    await initializeDatabase(db);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('departments_fts');
    expect(tableNames).toContain('people_fts');
    expect(tableNames).toContain('custom_fields_fts');
  });

  it('should be idempotent (can be run multiple times)', async () => {
    await initializeDatabase(db);
    // Run it again - should log "Migration: ..." but not throw errors
    await expect(initializeDatabase(db)).resolves.not.toThrow();
  });

  it('should verify schema of specific tables', async () => {
    await initializeDatabase(db);

    const orgColumns = db.prepare('PRAGMA table_info(organizations)').all() as { name: string }[];
    const orgColNames = orgColumns.map(c => c.name);

    expect(orgColNames).toContain('is_public');
    expect(orgColNames).toContain('share_token');

    const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
    const userColNames = userColumns.map(c => c.name);

    expect(userColNames).toContain('totp_secret');
    expect(userColNames).toContain('is_discoverable');
    expect(userColNames).toContain('must_change_password');
  });

  it('should set WAL mode and other pragmas', async () => {
    await initializeDatabase(db);

    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    expect(foreignKeys).toBe(1);
  });
});
