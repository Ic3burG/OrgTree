import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to declare and initialize the database before mocking
const { testDb } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');

  // Setup minimal schema for FTS testing
  db.exec(`
    -- Main tables
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
      email TEXT,
      phone TEXT,
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

    -- FTS tables
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

    CREATE VIRTUAL TABLE custom_fields_fts USING fts5(
      entity_type,
      entity_id UNINDEXED,
      field_values,
      content='',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);

  return { testDb: db };
});

// Mock the database module
vi.mock('../db.js', () => {
  return {
    default: testDb,
  };
});

import { checkFtsIntegrity, optimizeFtsIndexes } from './fts-maintenance.service.js';

describe('FTS Maintenance Service', () => {
  beforeEach(() => {
    // Clear data between tests
    testDb.exec('DELETE FROM departments');
    testDb.exec('DELETE FROM people');
    testDb.exec('DELETE FROM custom_field_definitions');
    testDb.exec('DELETE FROM custom_field_values');
    testDb.exec("DELETE FROM departments_fts WHERE rowid IN (SELECT rowid FROM departments_fts)");
    testDb.exec("DELETE FROM people_fts WHERE rowid IN (SELECT rowid FROM people_fts)");
    testDb.exec('DELETE FROM custom_fields_fts');
  });

  describe('checkFtsIntegrity()', () => {
    it('should return properly formatted health status', () => {
      const result = checkFtsIntegrity();

      // Check required top-level properties
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('tables');
      expect(result).toHaveProperty('lastChecked');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('statistics');

      // Verify types
      expect(typeof result.healthy).toBe('boolean');
      expect(Array.isArray(result.tables)).toBe(true);
      expect(Array.isArray(result.issues)).toBe(true);

      // Verify statistics
      expect(result.statistics).toBeDefined();
      expect(result.statistics).toHaveProperty('totalIndexedDepartments');
      expect(result.statistics).toHaveProperty('totalIndexedPeople');
      expect(result.statistics).toHaveProperty('totalIndexedCustomFields');
      expect(result.statistics).toHaveProperty('ftsSize');
      expect(result.statistics).toHaveProperty('recommendations');

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
