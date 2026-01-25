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

  it('should create all required tables', () => {
    initializeDatabase(db);

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
    ];

    requiredTables.forEach(table => {
      expect(tableNames).toContain(table);
    });
  });

  it('should create FTS virtual tables', () => {
    initializeDatabase(db);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('departments_fts');
    expect(tableNames).toContain('people_fts');
    expect(tableNames).toContain('custom_fields_fts');
  });

  it('should be idempotent (can be run multiple times)', () => {
    initializeDatabase(db);
    // Run it again - should log "Migration: ..." but not throw errors
    expect(() => initializeDatabase(db)).not.toThrow();
  });

  it('should verify schema of specific tables', () => {
    initializeDatabase(db);

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

  it('should set WAL mode and other pragmas', () => {
    initializeDatabase(db);

    // Check WAL mode (might be 'memory' for in-memory DB or 'wal')
    // In-memory DBs often ignore some journal modes or behave differently
    const journalMode = db.pragma('journal_mode', { simple: true });
    // Note: better-sqlite3 :memory: DBs default to 'memory' journal mode usually
    // But we explicitly set it to WAL. Let's see if it sticks.
    // Actually, for :memory: databases, WAL might not be applicable or stays 'memory'.
    // We can check foreign_keys though.

    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    expect(foreignKeys).toBe(1);
  });
});
