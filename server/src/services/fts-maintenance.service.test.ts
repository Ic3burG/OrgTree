import { describe, it, expect, vi } from 'vitest';

// Mock the database module
vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      deleted_at DATETIME
    );

    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      deleted_at DATETIME
    );

    CREATE TABLE custom_field_definitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      field_key TEXT NOT NULL,
      is_searchable INTEGER DEFAULT 1,
      deleted_at DATETIME
    );

    CREATE TABLE custom_field_values (
      id TEXT PRIMARY KEY,
      field_definition_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      value TEXT,
      deleted_at DATETIME
    );

    CREATE VIRTUAL TABLE custom_fields_fts USING fts5(
      entity_type,
      entity_id UNINDEXED,
      field_values,
      content='',
      tokenize='porter unicode61 remove_diacritics 2'
    );

    CREATE VIRTUAL TABLE departments_fts USING fts5(
      name,
      description,
      content='departments',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );

    CREATE VIRTUAL TABLE people_fts USING fts5(
      name,
      title,
      email,
      phone,
      content='people',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);

  return { default: db };
});

import { checkFtsIntegrity, optimizeFtsIndexes } from './fts-maintenance.service.js';

describe('FTS Maintenance Service', () => {
  describe('checkFtsIntegrity()', () => {
    it('should return properly formatted health status', () => {
      const result = checkFtsIntegrity();

      // Check required top-level properties
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('tables');
      expect(result).toHaveProperty('lastChecked');
      expect(result).toHaveProperty('issues');

      // Verify types
      expect(typeof result.healthy).toBe('boolean');
      expect(Array.isArray(result.tables)).toBe(true);
      expect(Array.isArray(result.issues)).toBe(true);

      // If tables exist, check their structure
      if (result.tables.length > 0) {
        expect(result.tables[0]).toHaveProperty('table');
        expect(result.tables[0]).toHaveProperty('expected');
        expect(result.tables[0]).toHaveProperty('actual');
        expect(result.tables[0]).toHaveProperty('inSync');
      }
    });

    it('should include a valid timestamp', () => {
      const result = checkFtsIntegrity();
      expect(result.lastChecked).toBeTruthy();
      const timestamp = new Date(result.lastChecked);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('optimizeFtsIndexes()', () => {
    it('should execute without throwing errors', () => {
      expect(() => optimizeFtsIndexes()).not.toThrow();
    });
  });
});
