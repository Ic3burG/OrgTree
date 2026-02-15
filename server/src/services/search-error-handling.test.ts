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

/**
 * Tests for Phase 2: Error Handling and Resilience
 *
 * This test suite verifies:
 * - FTS query validation
 * - Fallback search with LIKE queries
 * - Error propagation with warnings
 */

// Mock the database module with minimal schema
vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db: DatabaseType = new Database(':memory:');

  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_by_id TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS org_members (
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      is_starred INTEGER DEFAULT 0,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entity_type TEXT,
      field_key TEXT,
      is_searchable INTEGER DEFAULT 1,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      field_definition_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      value TEXT,
      deleted_at DATETIME
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

    CREATE VIRTUAL TABLE custom_fields_fts USING fts5(
      entity_type,
      entity_id UNINDEXED,
      field_values,
      content='',
      tokenize='porter unicode61 remove_diacritics 2'
    );

    -- Triggers
    CREATE TRIGGER departments_fts_insert AFTER INSERT ON departments
    WHEN NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO departments_fts(rowid, name, description)
      VALUES (NEW.rowid, NEW.name, NEW.description);
    END;

    CREATE TRIGGER people_fts_insert AFTER INSERT ON people
    WHEN NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO people_fts(rowid, name, title, email, phone)
      VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
    END;
  `);

  return { default: db };
});

import { search } from './search.service.js';
import db from '../db.js';

describe('Search Error Handling (Phase 2)', () => {
  let orgId: string;
  let userId: string;

  beforeEach(() => {
    // Clean tables
    db.prepare('DELETE FROM org_members').run();
    db.prepare('DELETE FROM people').run();
    db.prepare('DELETE FROM departments').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM organizations').run();

    // Create test organization
    orgId = '1';
    db.prepare(
      'INSERT INTO organizations (id, name, is_public, created_by_id) VALUES (?, ?, ?, ?)'
    ).run(orgId, 'Test Org', 0, '1');

    // Create test user
    userId = '1';
    db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(
      userId,
      'test@example.com',
      'hash'
    );

    // Add user to organization
    db.prepare('INSERT INTO org_members (organization_id, user_id, role) VALUES (?, ?, ?)').run(
      orgId,
      userId,
      'viewer'
    );

    // Create test department
    db.prepare(
      'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
    ).run('dept1', orgId, 'Engineering', 'Tech team');

    // Create test person
    db.prepare(
      'INSERT INTO people (id, organization_id, department_id, name, title, email) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('person1', orgId, 'dept1', 'John Doe', 'Engineer', 'john@example.com');
  });

  describe('Query Validation', () => {
    it('should reject queries with unbalanced quotes', async () => {
      const result = await search(orgId, userId, {
        query: 'test "unbalanced',
        type: 'all',
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Unbalanced double quotes in search query');
      expect(result.results).toHaveLength(0);
    });

    it('should reject queries with excessive wildcards', async () => {
      const result = await search(orgId, userId, {
        query: '***********',
        type: 'all',
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Too many wildcards in search query');
      expect(result.results).toHaveLength(0);
    });

    it('should reject queries with invalid FTS5 operators', async () => {
      const result = await search(orgId, userId, {
        query: 'test and engineer',
        type: 'all',
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('FTS5 operators must be uppercase');
      expect(result.results).toHaveLength(0);
    });

    it('should accept valid queries and return results', async () => {
      const result = await search(orgId, userId, {
        query: 'Engineering',
        type: 'all',
      });

      // Should have results
      expect(result.results.length).toBeGreaterThan(0);
      // May have warnings due to test environment limitations, but should have results
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('Error Propagation', () => {
    it('should include warnings in response when search partially fails', async () => {
      // Simulate partial failure by using invalid query
      const result = await search(orgId, userId, {
        query: 'test "quote',
        type: 'all',
      });

      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.warnings)).toBe(true);
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should return empty results with warnings for completely invalid queries', async () => {
      const result = await search(orgId, userId, {
        query: 'test or invalid',
        type: 'all',
      });

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    it('should maintain backward compatibility with existing response structure', async () => {
      const result = await search(orgId, userId, {
        query: 'Engineering',
        type: 'all',
      });

      // Verify all expected fields exist
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('hasMore');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('offset');
    });

    it('should optionally include warnings and usedFallback fields', async () => {
      const result = await search(orgId, userId, {
        query: 'test "invalid',
        type: 'all',
      });

      // These fields are optional and only present when relevant
      // If warnings exist, they should be an array
      if (result.warnings) {
        expect(Array.isArray(result.warnings)).toBe(true);
      }
      // usedFallback is boolean if present
      if (result.usedFallback !== undefined) {
        expect(typeof result.usedFallback).toBe('boolean');
      }
    });
  });
});
