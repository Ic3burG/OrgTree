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

import { vi, describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { search, validateFtsQuery } from './search.service.js';
import { searchUsers } from './users.service.js';

// Mock DB to use memory
vi.mock('../db.js', async () => {
  const { initializeDatabase } = await import('../db-init.js');
  const db = new Database(':memory:');
  await initializeDatabase(db);
  return { default: db };
});

import db from '../db.js';

describe('Search & User Discovery Security', () => {
  const org1Id = 'org-1';
  const org2Id = 'org-2';
  const user1Id = 'user-1';
  const user2Id = 'user-2';

  beforeEach(async () => {
    // Clear tables in correct order to respect FK constraints
    const tables = [
      'organization_members',
      'search_analytics',
      'saved_searches',
      'people',
      'departments',
      'organizations',
      'users',
    ];
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch {
        // Ignore table deletion errors
      }
    }

    // Setup Org 1
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role, is_discoverable) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user1Id, 'user1@example.com', 'hash', 'User One', 'admin', 1);
    db.prepare(
      'INSERT INTO organizations (id, name, created_by_id, is_public) VALUES (?, ?, ?, ?)'
    ).run(org1Id, 'Org One', user1Id, 0);
    db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
      'dept-1',
      org1Id,
      'Confidential Dept'
    );

    // Setup Org 2
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role, is_discoverable) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user2Id, 'user2@example.com', 'hash', 'User Two', 'admin', 0); // user2 is NOT discoverable
    db.prepare(
      'INSERT INTO organizations (id, name, created_by_id, is_public) VALUES (?, ?, ?, ?)'
    ).run(org2Id, 'Org Two', user2Id, 0);
    db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
      'dept-2',
      org2Id,
      'Secret Dept'
    );
  });

  describe('Search Service (Within Org)', () => {
    it('should NOT allow searching for departments in other organizations', async () => {
      // User 1 searching in Org 2
      await expect(search(org2Id, user1Id, { query: 'Secret' })).rejects.toThrow();
    });

    it('should handle FTS syntax injection characters safely', async () => {
      const maliciousQueries = [
        'name MATCH "foo"',
        '") OR 1=1 --',
        'NEAR(foo bar)',
        'AND NOT name:alice',
        '*'.repeat(100), // Excessive wildcards
      ];

      for (const query of maliciousQueries) {
        // Should either be blocked by validateFtsQuery or escaped by buildFtsQuery
        const validation = validateFtsQuery(query);
        if (validation.valid) {
          const res = await search(org1Id, user1Id, { query });
          expect(res.results.length).toBe(0); // Should not match anything due to escaping
        } else {
          // If validation fails, it's also a win for security
          expect(validation.error).toBeDefined();
        }
      }
    });

    it('should prevent DoS via extremely long queries', async () => {
      const longQuery = 'a '.repeat(5000); // 10,000 chars
      const res = await search(org1Id, user1Id, { query: longQuery });
      expect(res.performance?.queryTimeMs).toBeLessThan(1000); // Should not hang
    });
  });

  describe('User Discovery (Global)', () => {
    it('should only return discoverable users', async () => {
      // User One is discoverable, User Two is not
      const results = searchUsers('User');
      expect(results.some(u => u.id === user1Id)).toBe(true);
      expect(results.some(u => u.id === user2Id)).toBe(false);
    });

    it('should be case insensitive', async () => {
      const results = searchUsers('user one');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle SQL injection in LIKE query', async () => {
      const malicious = "foo%' OR 1=1 --";
      const results = searchUsers(malicious);
      // Should not return user2 who is not discoverable
      expect(results.some(u => u.id === user2Id)).toBe(false);
    });
  });
});
