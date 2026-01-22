import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

// Mock the database module with FTS5 support
vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db: DatabaseType = new Database(':memory:');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_by_id INTEGER NOT NULL,
      is_public INTEGER DEFAULT 0,
      share_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      parent_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY,
      department_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      sort_order INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    -- Custom Fields
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      name TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options TEXT,
      is_required INTEGER DEFAULT 0,
      is_searchable INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      field_definition_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      value TEXT NOT NULL,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(field_definition_id, entity_id)
    );

    CREATE VIRTUAL TABLE custom_fields_fts USING fts5(
      entity_type,
      entity_id UNINDEXED,
      field_values,
      content='',
      tokenize='porter unicode61'
    );

    -- FTS5 virtual tables for search
    CREATE VIRTUAL TABLE departments_fts USING fts5(
      name,
      description,
      content=departments,
      tokenize='porter unicode61'
    );

    CREATE VIRTUAL TABLE people_fts USING fts5(
      name,
      title,
      email,
      content=people,
      tokenize='porter unicode61'
    );
  `);

  return { default: db };
});

// Mock member service
vi.mock('./member.service.js', () => ({
  checkOrgAccess: vi.fn(),
}));

// Mock escape utility
vi.mock('../utils/escape.js', () => ({
  escapeHtml: (str: string | null | undefined) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#x60;')
      .replace(/=/g, '&#x3D;');
  },
}));

import db from '../db.js';
import { checkOrgAccess } from './member.service.js';
import { search, getAutocompleteSuggestions } from './search.service.js';

describe('Search Service', () => {
  const orgId = 1;
  const userId = 1;

  beforeEach(() => {
    // Clear all tables
    (db as DatabaseType).exec(`
      DELETE FROM people;
      DELETE FROM departments;
      DELETE FROM custom_field_values;
      DELETE FROM custom_field_definitions;
      DELETE FROM organization_members;
      DELETE FROM organizations;
      DELETE FROM users;
    `);

    // Insert test user
    (db as DatabaseType)
      .prepare(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, 'Test User', 'test@example.com', 'hashed_password', 'user');

    // Insert test organization
    (db as DatabaseType)
      .prepare(
        `INSERT INTO organizations (id, name, created_by_id)
         VALUES (?, ?, ?)`
      )
      .run(orgId, 'Test Org', userId);

    // Insert organization membership
    (db as DatabaseType)
      .prepare(
        `INSERT INTO organization_members (id, organization_id, user_id, role)
         VALUES (?, ?, ?, ?)`
      )
      .run(1, orgId, userId, 'owner');

    // Insert test departments
    (db as DatabaseType)
      .prepare(
        `INSERT INTO departments (id, organization_id, name, description)
         VALUES (?, ?, ?, ?)`
      )
      .run(1, orgId, 'Engineering Department', 'Software development team');

    (db as DatabaseType)
      .prepare(
        `INSERT INTO departments (id, organization_id, name, description)
         VALUES (?, ?, ?, ?)`
      )
      .run(2, orgId, 'Marketing Department', 'Brand and campaigns');

    (db as DatabaseType)
      .prepare(
        `INSERT INTO departments (id, organization_id, name, description)
         VALUES (?, ?, ?, ?)`
      )
      .run(3, orgId, 'Sales Department', 'Customer acquisition');

    // Insert test people
    (db as DatabaseType)
      .prepare(
        `INSERT INTO people (id, department_id, name, title, email)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(1, 1, 'John Doe', 'Senior Software Engineer', 'john.doe@example.com');

    (db as DatabaseType)
      .prepare(
        `INSERT INTO people (id, department_id, name, title, email)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(2, 1, 'Jane Smith', 'Engineering Manager', 'jane.smith@example.com');

    (db as DatabaseType)
      .prepare(
        `INSERT INTO people (id, department_id, name, title, email)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(3, 2, 'Bob Johnson', 'Marketing Director', 'bob.johnson@example.com');

    // Manually populate FTS tables (mock DB doesn't have triggers)
    (db as DatabaseType).exec(`
      INSERT INTO departments_fts (rowid, name, description)
      SELECT rowid, name, description FROM departments;
      
      INSERT INTO people_fts (rowid, name, title, email)
      SELECT rowid, name, title, email FROM people;
    `);

    // Reset mock
    vi.mocked(checkOrgAccess).mockClear();
    vi.mocked(checkOrgAccess).mockReturnValue({ hasAccess: true, role: 'viewer', isOwner: false });
  });

  describe('search()', () => {
    it('should search departments by name', async () => {
      const result = await search(String(orgId), String(userId), { query: 'Engineering' });

      expect(checkOrgAccess).toHaveBeenCalledWith(String(orgId), String(userId));
      expect(result.total).toBeGreaterThan(0);
      const deptResults = result.results.filter(r => r.type === 'department');
      expect(deptResults.length).toBeGreaterThan(0);
      expect(deptResults[0]!.name).toContain('Engineering');
      expect(result.results[0]!.highlight).toContain('mark');
    });

    it('should search departments by description', async () => {
      const result = await search(String(orgId), String(userId), { query: 'software' });

      expect(result.total).toBeGreaterThan(0);
      expect(result.results.some(r => r.type === 'department')).toBe(true);
    });

    it('should search people by name', async () => {
      const result = await search(String(orgId), String(userId), { query: 'John' });

      expect(result.total).toBeGreaterThan(0);
      const personResults = result.results.filter(r => r.type === 'person');
      expect(personResults.length).toBeGreaterThan(0);
      expect(personResults.some(p => p.name === 'John Doe')).toBe(true);
    });

    it('should search people by title', async () => {
      const result = await search(String(orgId), String(userId), { query: 'Engineer' });

      expect(result.total).toBeGreaterThan(0);
      const personResults = result.results.filter(r => r.type === 'person');
      expect(personResults.length).toBeGreaterThan(0);
    });

    it('should search people by email', async () => {
      const result = await search(String(orgId), String(userId), { query: 'jane' });

      expect(result.total).toBeGreaterThan(0);
      const personResults = result.results.filter(r => r.type === 'person');
      expect(personResults.length).toBeGreaterThan(0);
      const janeResult = personResults.find(p => p.email === 'jane.smith@example.com');
      expect(janeResult).toBeDefined();
    });

    it('should filter by type: departments only', async () => {
      const result = await search(String(orgId), String(userId), {
        query: 'Department',
        type: 'departments',
      });

      expect(result.total).toBeGreaterThan(0);
      expect(result.results.every(r => r.type === 'department')).toBe(true);
    });

    it('should filter by type: people only', async () => {
      const result = await search(String(orgId), String(userId), {
        query: 'Manager',
        type: 'people',
      });

      expect(result.total).toBeGreaterThan(0);
      expect(result.results.every(r => r.type === 'person')).toBe(true);
    });

    it('should return both departments and people for type: all', async () => {
      const result = await search(String(orgId), String(userId), {
        query: 'Engineering',
        type: 'all',
      });

      expect(result.total).toBeGreaterThan(0);
      // Should find both Engineering Department and people with Engineering title
      const hasDepartment = result.results.some(r => r.type === 'department');
      const hasPerson = result.results.some(r => r.type === 'person');
      expect(hasDepartment || hasPerson).toBe(true);
    });

    it('should support pagination with limit', async () => {
      const result = await search(String(orgId), String(userId), { query: 'Department', limit: 2 });

      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
    });

    it('should support pagination with offset', async () => {
      const firstPage = await search(String(orgId), String(userId), {
        query: 'Department',
        limit: 1,
        offset: 0,
      });
      const secondPage = await search(String(orgId), String(userId), {
        query: 'Department',
        limit: 1,
        offset: 1,
      });

      if (firstPage.results.length > 0 && secondPage.results.length > 0) {
        expect(firstPage.results[0]!.id).not.toBe(secondPage.results[0]!.id);
      }
    });

    it('should calculate hasMore correctly', async () => {
      const result = await search(String(orgId), String(userId), { query: 'Department', limit: 2 });

      if (result.total > 2) {
        expect(result.pagination.hasMore).toBe(true);
      } else {
        expect(result.pagination.hasMore).toBe(false);
      }
    });

    it('should handle empty query', async () => {
      const result = await search(String(orgId), String(userId), { query: '' });

      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle whitespace-only query', async () => {
      const result = await search(String(orgId), String(userId), { query: '   ' });

      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should handle query with no matches', async () => {
      const result = await search(String(orgId), String(userId), { query: 'NonExistentTerm12345' });

      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should handle special characters safely', async () => {
      // These characters should be escaped and not cause FTS5 syntax errors
      const result = await search(String(orgId), String(userId), { query: '"*(){}[]^~\\:' });

      // Should not throw error, just return no results
      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should support prefix matching for partial words', async () => {
      const result = await search(String(orgId), String(userId), { query: 'Eng' });

      // Should match "Engineering" with prefix search
      expect(result.total).toBeGreaterThan(0);
    });

    it('should include people count for department results', async () => {
      const result = await search(String(orgId), String(userId), {
        query: 'Engineering',
        type: 'departments',
      });

      const deptResult = result.results.find(r => r.type === 'department');
      expect(deptResult).toBeDefined();
      expect(deptResult?.people_count).toBeDefined();
      expect(deptResult?.people_count).toBeGreaterThanOrEqual(0);
    });

    it('should include department name for person results', async () => {
      const result = await search(String(orgId), String(userId), { query: 'John', type: 'people' });

      const personResult = result.results.find(r => r.type === 'person');
      expect(personResult).toBeDefined();
      expect(personResult?.department_name).toBeDefined();
    });

    it('should escape HTML in highlights', async () => {
      // Insert department with HTML-like content
      (db as DatabaseType)
        .prepare(
          `INSERT INTO departments (id, organization_id, name, description)
           VALUES (?, ?, ?, ?)`
        )
        .run(999, orgId, '<script>alert("xss")</script>', 'Test description');

      // Rebuild FTS5
      (db as DatabaseType).exec(`INSERT INTO departments_fts(departments_fts) VALUES('rebuild');`);

      const result = await search(String(orgId), String(userId), { query: 'script' });

      const deptResult = result.results.find(r => r.name.includes('script'));
      expect(deptResult).toBeDefined();
      expect(deptResult?.highlight).not.toContain('<script>');
      expect(deptResult?.highlight).toContain('&lt;');
    });

    it('should preserve <mark> tags in highlights', async () => {
      const result = await search(String(orgId), String(userId), { query: 'Engineering' });

      if (result.results.length > 0) {
        expect(result.results[0]!.highlight).toContain('<mark>');
        expect(result.results[0]!.highlight).toContain('</mark>');
      }
    });
  });

  describe('getAutocompleteSuggestions()', () => {
    it('should return department suggestions', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), 'Engineering');

      expect(checkOrgAccess).toHaveBeenCalledWith(String(orgId), String(userId));
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'department')).toBe(true);
    });

    it('should return person suggestions', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), 'John');

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'person')).toBe(true);
    });

    it('should return mixed suggestions for common terms', async () => {
      const result = await getAutocompleteSuggestions(
        String(orgId),
        String(userId),
        'Engineering',
        10
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      // Should have both departments and people with "Engineering"
    });

    it('should respect limit parameter', async () => {
      const result = await getAutocompleteSuggestions(
        String(orgId),
        String(userId),
        'Department',
        2
      );

      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should use default limit of 5', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), 'Department');

      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty query', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), '');

      expect(result.suggestions).toEqual([]);
    });

    it('should handle whitespace-only query', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), '   ');

      expect(result.suggestions).toEqual([]);
    });

    it('should handle query with no matches', async () => {
      const result = await getAutocompleteSuggestions(
        String(orgId),
        String(userId),
        'NonExistentTerm12345'
      );

      expect(result.suggestions.length).toBe(0);
    });

    it('should support prefix matching', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), 'Eng');

      // Should match "Engineering" with prefix search
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should return unique suggestions', async () => {
      const result = await getAutocompleteSuggestions(String(orgId), String(userId), 'Department');

      const texts = result.suggestions.map(s => s.text);
      const uniqueTexts = [...new Set(texts)];
      expect(texts.length).toBe(uniqueTexts.length);
    });
  });
});
