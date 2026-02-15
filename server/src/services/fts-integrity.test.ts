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

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { setupTestDatabase } from '../test-helpers/test-db-schema.js';

/**
 * Tests for Phase 3.4: FTS Integrity Tests
 *
 * This test suite verifies:
 * - FTS integrity checking detects sync issues
 * - Bulk operations maintain FTS sync
 */

describe('FTS Integrity Tests (Phase 3.4)', () => {
  let db: DatabaseType;
  let orgId: string;
  let userId: string;

  beforeEach(() => {
    // Create fresh database for each test
    db = new Database(':memory:');
    setupTestDatabase(db, { withFts: true, withTriggers: true });

    // Setup test data
    orgId = 'org1';
    userId = 'user1';

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      userId,
      'test@example.com',
      'hash',
      'Test User'
    );

    db.prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)').run(
      orgId,
      'Test Org',
      userId
    );

    db.prepare('INSERT INTO org_members (organization_id, user_id, role) VALUES (?, ?, ?)').run(
      orgId,
      userId,
      'owner'
    );
  });

  describe('FTS Sync Detection', () => {
    it('should maintain sync when departments are inserted', () => {
      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept1',
        orgId,
        'Engineering'
      );

      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept2',
        orgId,
        'Sales'
      );

      const expected = db
        .prepare('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL')
        .get() as { count: number };
      const actual = db.prepare('SELECT COUNT(*) as count FROM departments_fts_docsize').get() as {
        count: number;
      };

      expect(expected.count).toBe(2);
      expect(actual.count).toBe(2);
    });

    it('should maintain sync when people are inserted', () => {
      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept1',
        orgId,
        'Engineering'
      );

      db.prepare(
        'INSERT INTO people (id, organization_id, department_id, name, title) VALUES (?, ?, ?, ?, ?)'
      ).run('person1', orgId, 'dept1', 'John Doe', 'Engineer');

      db.prepare(
        'INSERT INTO people (id, organization_id, department_id, name, title) VALUES (?, ?, ?, ?, ?)'
      ).run('person2', orgId, 'dept1', 'Jane Smith', 'Designer');

      const expected = db
        .prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL')
        .get() as { count: number };
      const actual = db.prepare('SELECT COUNT(*) as count FROM people_fts_docsize').get() as {
        count: number;
      };

      expect(expected.count).toBe(2);
      expect(actual.count).toBe(2);
    });
  });

  describe('Bulk Operations', () => {
    it('should maintain FTS sync after 100 department inserts', () => {
      const stmt = db.prepare(
        'INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)'
      );

      for (let i = 1; i <= 100; i++) {
        stmt.run(`dept${i}`, orgId, `Department ${i}`);
      }

      const expected = db
        .prepare('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL')
        .get() as { count: number };
      const actual = db.prepare('SELECT COUNT(*) as count FROM departments_fts_docsize').get() as {
        count: number;
      };

      expect(expected.count).toBe(100);
      expect(actual.count).toBe(100);
    });

    it('should maintain FTS sync after mixed CRUD operations', () => {
      // Insert 3 departments
      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept1',
        orgId,
        'Engineering'
      );

      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept2',
        orgId,
        'Sales'
      );

      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept3',
        orgId,
        'Marketing'
      );

      // Update one
      db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(
        'Product Engineering',
        'dept1'
      );

      // Hard delete one
      db.prepare('DELETE FROM departments WHERE id = ?').run('dept2');

      // Insert another
      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept4',
        orgId,
        'HR'
      );

      const expected = db
        .prepare('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL')
        .get() as { count: number };
      const actual = db.prepare('SELECT COUNT(*) as count FROM departments_fts_docsize').get() as {
        count: number;
      };

      expect(expected.count).toBe(3); // dept1, dept3, dept4
      expect(actual.count).toBe(3);
    });

    it('should maintain sync with 50 people after bulk operations', () => {
      db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
        'dept1',
        orgId,
        'Engineering'
      );

      const stmt = db.prepare(
        'INSERT INTO people (id, organization_id, department_id, name, title) VALUES (?, ?, ?, ?, ?)'
      );

      for (let i = 1; i <= 60; i++) {
        stmt.run(`person${i}`, orgId, 'dept1', `Person ${i}`, `Title ${i}`);
      }

      // Delete 10
      for (let i = 1; i <= 10; i++) {
        db.prepare('DELETE FROM people WHERE id = ?').run(`person${i}`);
      }

      const expected = db
        .prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL')
        .get() as { count: number };
      const actual = db.prepare('SELECT COUNT(*) as count FROM people_fts_docsize').get() as {
        count: number;
      };

      expect(expected.count).toBe(50);
      expect(actual.count).toBe(50);
    });
  });
});
