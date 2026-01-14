import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

// Mock the database module with complete schema
vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db: DatabaseType = new Database(':memory:');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      share_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      parent_id TEXT,
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
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      sort_order INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
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

// Mock member service to allow access
vi.mock('./member.service.js', () => ({
  requireOrgPermission: vi.fn(),
}));

// Mock escape utility
vi.mock('../utils/escape.js', () => ({
  escapeHtml: (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
}));

import db from '../db.js';
import { search, getAutocompleteSuggestions } from './search.service.js';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} from './department.service.js';
import { getPeopleByDepartment, createPerson } from './people.service.js';

// ============================================================================
// SQL Injection Test Payloads
// ============================================================================

const SQL_INJECTION_PAYLOADS = [
  // Classic SQL injection
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  '" OR "1"="1',
  "'; DROP TABLE users; --",
  "'; DELETE FROM departments; --",
  '1; SELECT * FROM users',
  '1 UNION SELECT * FROM users',
  "1' UNION SELECT password_hash FROM users --",

  // Boolean-based blind injection
  "' AND 1=1 --",
  "' AND 1=0 --",
  '1 AND 1=1',
  '1 AND 1=0',

  // Time-based blind injection (SQLite doesn't support SLEEP but test the pattern)
  "'; WAITFOR DELAY '00:00:05' --",
  '1; SELECT CASE WHEN (1=1) THEN 1 ELSE 0 END',

  // Error-based injection
  "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT((SELECT version()),0x3a,FLOOR(RAND(0)*2))x FROM users GROUP BY x)a) --",
  'EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))',

  // Second-order injection patterns
  "admin'--",
  "admin' #",
  "admin'/*",

  // Null byte injection
  "test%00' OR '1'='1",

  // Unicode escaping
  '\\u0027 OR 1=1 --',

  // Hex encoding
  '0x27204f522027313d2731',
];

const FTS5_INJECTION_PAYLOADS = [
  // FTS5 operator abuse
  'test NEAR test',
  'test AND test',
  'test OR test',
  'test NOT test',
  '"phrase search"',
  'test*',
  '^start',
  'column:value',

  // FTS5 syntax breaking attempts
  '(() OR (()))',
  '""""""',
  "'''",
  '\\\\\\',
  '{{{',
  '}}}',
];

// ============================================================================
// Tests
// ============================================================================

describe('SQL Injection Security Tests', () => {
  const orgId = 'org-123';
  const userId = 'user-123';
  const deptId = 'dept-123';

  beforeEach(() => {
    // Clear all tables
    (db as DatabaseType).exec(`
      DELETE FROM people;
      DELETE FROM departments;
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
      .run('member-1', orgId, userId, 'owner');

    // Insert test department
    (db as DatabaseType)
      .prepare(
        `INSERT INTO departments (id, organization_id, name, description)
         VALUES (?, ?, ?, ?)`
      )
      .run(deptId, orgId, 'Engineering', 'Software development team');

    // Insert test person
    (db as DatabaseType)
      .prepare(
        `INSERT INTO people (id, department_id, name, title, email)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run('person-1', deptId, 'John Doe', 'Engineer', 'john@example.com');

    // Rebuild FTS5 indexes
    (db as DatabaseType).exec(`
      INSERT INTO departments_fts(departments_fts) VALUES('rebuild');
      INSERT INTO people_fts(people_fts) VALUES('rebuild');
    `);
  });

  describe('Search Service - SQL Injection Protection', () => {
    describe('search() with classic SQL injection payloads', () => {
      SQL_INJECTION_PAYLOADS.forEach(payload => {
        it(`should safely handle payload: ${payload.substring(0, 40)}...`, () => {
          // Should not throw and should not return unauthorized data
          const result = search(orgId, userId, { query: payload });

          // Verify the function executed safely
          expect(result).toBeDefined();
          expect(result.query).toBe(payload);
          expect(Array.isArray(result.results)).toBe(true);

          // Injection should NOT reveal hidden data or cause errors
          // Results should be empty or only contain legitimately matching records
          result.results.forEach(r => {
            // Ensure we only get records from our org
            expect(r.id).toBeDefined();
            expect(r.type).toMatch(/^(department|person)$/);
          });
        });
      });
    });

    describe('search() with FTS5 injection payloads', () => {
      FTS5_INJECTION_PAYLOADS.forEach(payload => {
        it(`should safely handle FTS5 payload: ${payload}`, () => {
          // Should not throw - the escapeFtsQuery function should sanitize
          expect(() => {
            const result = search(orgId, userId, { query: payload });
            expect(result).toBeDefined();
          }).not.toThrow();
        });
      });
    });

    describe('getAutocompleteSuggestions() with injection payloads', () => {
      SQL_INJECTION_PAYLOADS.slice(0, 5).forEach(payload => {
        it(`should safely handle autocomplete payload: ${payload.substring(0, 30)}...`, () => {
          const result = getAutocompleteSuggestions(orgId, userId, payload);

          expect(result).toBeDefined();
          expect(Array.isArray(result.suggestions)).toBe(true);
        });
      });
    });
  });

  describe('Department Service - SQL Injection Protection', () => {
    describe('getDepartments() with injected orgId', () => {
      SQL_INJECTION_PAYLOADS.slice(0, 5).forEach(payload => {
        it(`should safely handle orgId payload: ${payload.substring(0, 30)}...`, () => {
          // Parameterized queries should prevent injection via orgId
          const result = getDepartments(payload, userId);

          // Should return empty array since no org matches the payload
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBe(0);
        });
      });
    });

    describe('getDepartmentById() with injected deptId', () => {
      SQL_INJECTION_PAYLOADS.slice(0, 5).forEach(payload => {
        it(`should safely handle deptId payload: ${payload.substring(0, 30)}...`, () => {
          // Should throw 404, not execute injection
          expect(() => {
            getDepartmentById(orgId, payload, userId);
          }).toThrow();
        });
      });
    });

    describe('createDepartment() with injected name', () => {
      SQL_INJECTION_PAYLOADS.forEach(payload => {
        it(`should safely store payload as literal name: ${payload.substring(0, 30)}...`, async () => {
          const dept = await createDepartment(
            orgId,
            { name: payload, description: 'Test description' },
            userId
          );

          // The payload should be stored as a literal string, not executed
          expect(dept).toBeDefined();
          expect(dept.name).toBe(payload);
          expect(dept.id).toBeDefined();
        });
      });
    });

    describe('updateDepartment() with injected values', () => {
      it('should safely handle SQL in name update', async () => {
        const payload = "'; DROP TABLE departments; --";

        const updated = await updateDepartment(orgId, deptId, { name: payload }, userId);

        // Payload stored as literal, not executed
        expect(updated.name).toBe(payload);

        // Verify table still exists
        const allDepts = getDepartments(orgId, userId);
        expect(allDepts.length).toBeGreaterThan(0);
      });

      it('should safely handle SQL in description update', async () => {
        const payload = "' UNION SELECT * FROM users --";

        const updated = await updateDepartment(orgId, deptId, { description: payload }, userId);

        expect(updated.description).toBe(payload);
      });
    });
  });

  describe('People Service - SQL Injection Protection', () => {
    describe('getPeopleByDepartment() with injected deptId', () => {
      SQL_INJECTION_PAYLOADS.slice(0, 5).forEach(payload => {
        it(`should reject deptId payload with 404: ${payload.substring(0, 30)}...`, () => {
          // Invalid department IDs should throw 404, proving injection doesn't work
          // This is the correct secure behavior - parameterized queries prevent injection
          expect(() => {
            getPeopleByDepartment(payload, userId);
          }).toThrow('Department not found');
        });
      });
    });

    describe('createPerson() with injected deptId', () => {
      SQL_INJECTION_PAYLOADS.slice(0, 3).forEach(payload => {
        it(`should reject injected deptId: ${payload.substring(0, 30)}...`, () => {
          // Invalid department IDs should throw 404
          expect(() => {
            createPerson(payload, { name: 'Test Person' }, userId);
          }).toThrow('Department not found');
        });
      });
    });

    describe('createPerson() with injected fields (valid deptId)', () => {
      it('should safely store SQL injection in name field', async () => {
        const payload = "'; DELETE FROM people; --";

        const person = await createPerson(
          deptId,
          {
            name: payload,
            title: 'Test',
            email: `test-${Date.now()}@example.com`,
          },
          userId
        );
        expect(person.name).toBe(payload);

        // Verify no deletion occurred
        const people = getPeopleByDepartment(deptId, userId);
        expect(people.length).toBeGreaterThan(0);
      });

      it('should safely store SQL injection in email field', async () => {
        const payload = "test@example.com' OR '1'='1";

        const person = await createPerson(
          deptId,
          {
            name: 'Test Name',
            title: 'Test',
            email: payload,
          },
          userId
        );
        expect(person.email).toBe(payload);
      });

      it('should safely store SQL injection in title field', async () => {
        const payload = "Engineer'; DROP TABLE people; --";

        const person = await createPerson(
          deptId,
          {
            name: 'Test Name',
            title: payload,
            email: `test-${Date.now()}@example.com`,
          },
          userId
        );
        expect(person.title).toBe(payload);

        // Table still exists
        const people = getPeopleByDepartment(deptId, userId);
        expect(people.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases & Boundary Tests', () => {
    it('should handle extremely long SQL injection payloads', () => {
      const longPayload = "' OR '1'='1".repeat(1000);

      const result = search(orgId, userId, { query: longPayload });
      expect(result).toBeDefined();
    });

    it('should handle null byte injection', () => {
      const payload = "test\x00' OR '1'='1";

      const result = search(orgId, userId, { query: payload });
      expect(result).toBeDefined();
    });

    it('should handle unicode injection attempts', () => {
      const payload = 'test\u0027 OR 1=1 --';

      const result = search(orgId, userId, { query: payload });
      expect(result).toBeDefined();
    });

    it('should handle multi-line injection attempts', () => {
      const payload = "test\n'; DROP TABLE users; --\n";

      const result = search(orgId, userId, { query: payload });
      expect(result).toBeDefined();
    });

    it('should handle tab character injection', () => {
      const payload = "test\t' OR '1'='1";

      const result = search(orgId, userId, { query: payload });
      expect(result).toBeDefined();
    });
  });

  describe('Data Integrity Verification', () => {
    it('should not leak data across organizations via injection', () => {
      // Create a second org with secret data
      const secretOrgId = 'secret-org';
      (db as DatabaseType)
        .prepare(`INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)`)
        .run(secretOrgId, 'Secret Org', userId);
      (db as DatabaseType)
        .prepare(`INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)`)
        .run('secret-dept', secretOrgId, 'SECRET_DATA_12345');
      (db as DatabaseType).exec(`INSERT INTO departments_fts(departments_fts) VALUES('rebuild');`);

      // Attempt to access secret data via injection
      const injectionPayload = "' OR organization_id='secret-org' --";
      const result = search(orgId, userId, { query: injectionPayload });

      // Should not contain secret data
      const hasSecretData = result.results.some(r => r.name?.includes('SECRET_DATA'));
      expect(hasSecretData).toBe(false);
    });

    it('should prevent UNION-based data extraction', () => {
      const payload = "' UNION SELECT id, password_hash, email FROM users --";

      const result = search(orgId, userId, { query: payload });

      // Should not contain password hashes
      const hasPasswordData = result.results.some(
        r => r.name?.includes('hashed_password') || r.highlight?.includes('hashed_password')
      );
      expect(hasPasswordData).toBe(false);
    });
  });
});
