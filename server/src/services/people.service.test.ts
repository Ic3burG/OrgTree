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

// Mock the database module
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
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('person', 'department')),
      name TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'url', 'email', 'phone')),
      options TEXT,
      is_required BOOLEAN DEFAULT 0,
      is_searchable BOOLEAN DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, entity_type, field_key)
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      field_definition_id TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('person', 'department')),
      entity_id TEXT NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
      UNIQUE(field_definition_id, entity_id)
    );
  `);

  return { default: db };
});

// Mock member service
vi.mock('./member.service.js', () => ({
  requireOrgPermission: vi.fn(),
}));

import db from '../db.js';
import { requireOrgPermission } from './member.service.js';
import {
  getPeopleByDepartment,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
} from './people.service.js';

describe('People Service', () => {
  const orgId = 'test-org-id';
  const userId = 'test-user-id';
  const deptId = 'test-dept-id';

  beforeEach(() => {
    // Clear tables
    (db as DatabaseType).exec(`
      DELETE FROM people;
      DELETE FROM departments;
      DELETE FROM organizations;
      DELETE FROM users;
    `);

    // Setup initial data
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO users (id, name, email, password_hash)
      VALUES (?, 'Test User', 'test@example.com', 'hash')
    `
      )
      .run(userId);

    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO organizations (id, name, created_by_id)
      VALUES (?, 'Test Org', ?)
    `
      )
      .run(orgId, userId);

    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO departments (id, organization_id, name)
      VALUES (?, ?, 'Test Dept')
    `
      )
      .run(deptId, orgId);

    vi.clearAllMocks();
  });

  describe('getPeopleByDepartment', () => {
    it('should return all people for a department', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name, sort_order)
        VALUES ('person-1', ?, 'Person 1', 1), ('person-2', ?, 'Person 2', 2)
      `
        )
        .run(deptId, deptId);

      const people = getPeopleByDepartment(deptId, userId);

      expect(people).toHaveLength(2);
      expect(people[0]?.name).toBe('Person 1');
      expect(people[1]?.name).toBe('Person 2');
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'viewer');
    });

    it('should not return deleted people', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name, deleted_at)
        VALUES ('person-1', ?, 'Person 1', datetime('now'))
      `
        )
        .run(deptId);

      const people = getPeopleByDepartment(deptId, userId);

      expect(people).toHaveLength(0);
    });

    it('should return starred people first', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name, sort_order, is_starred)
        VALUES 
          ('person-1', ?, 'Regular Person', 1, 0), 
          ('person-2', ?, 'Starred Person', 2, 1)
      `
        )
        .run(deptId, deptId);

      const people = getPeopleByDepartment(deptId, userId);

      expect(people).toHaveLength(2);
      expect(people[0]?.name).toBe('Starred Person');
      expect(people[1]?.name).toBe('Regular Person');
    });
  });

  describe('getPersonById', () => {
    it('should return a person by ID with department and organization details', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Person 1')
      `
        )
        .run(deptId);

      const person = getPersonById('person-1', userId);

      expect(person.id).toBe('person-1');
      expect(person.name).toBe('Person 1');
      expect(person.department.id).toBe(deptId);
      expect(person.department.organization.id).toBe(orgId);
    });

    it('should throw 404 if person not found', () => {
      expect(() => getPersonById('non-existent', userId)).toThrow('Person not found');
    });
  });

  describe('createPerson', () => {
    it('should create a new person', async () => {
      const person = await createPerson(
        deptId,
        {
          name: 'New Person',
          title: 'Developer',
          email: 'new@example.com',
        },
        userId
      );
      expect(person.name).toBe('New Person');
      expect(person.title).toBe('Developer');
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'editor');
    });

    it('should create a starred person', async () => {
      const person = await createPerson(
        deptId,
        {
          name: 'Starred Person',
          isStarred: true,
        },
        userId
      );
      expect(person.name).toBe('Starred Person');
      expect(person.is_starred).toBe(1);
    });
  });

  describe('updatePerson', () => {
    it('should update person details', async () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Old Name')
      `
        )
        .run(deptId);

      const updated = await updatePerson('person-1', { name: 'New Name' }, userId);
      expect(updated.name).toBe('New Name');
    });

    it('should move person to a different department', async () => {
      const newDeptId = 'new-dept-id';
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO departments (id, organization_id, name)
        VALUES (?, ?, 'New Dept')
      `
        )
        .run(newDeptId, orgId);

      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Person 1')
      `
        )
        .run(deptId);

      const updated = await updatePerson('person-1', { departmentId: newDeptId }, userId);
      expect(updated.department_id).toBe(newDeptId);
    });
  });

  describe('deletePerson', () => {
    it('should soft delete a person', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Person 1')
      `
        )
        .run(deptId);

      deletePerson('person-1', userId);

      const person = (db as DatabaseType)
        .prepare('SELECT deleted_at FROM people WHERE id = ?')
        .get('person-1') as { deleted_at: string };
      expect(person.deleted_at).not.toBeNull();
    });
  });
});
