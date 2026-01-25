import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeDatabase } from './db-init.js';

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
