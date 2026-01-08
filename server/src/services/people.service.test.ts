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
      deleted_at DATETIME,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
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
    (db as DatabaseType).prepare(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (?, 'Test User', 'test@example.com', 'hash')
    `).run(userId);

    (db as DatabaseType).prepare(`
      INSERT INTO organizations (id, name, created_by_id)
      VALUES (?, 'Test Org', ?)
    `).run(orgId, userId);

    (db as DatabaseType).prepare(`
      INSERT INTO departments (id, organization_id, name)
      VALUES (?, ?, 'Test Dept')
    `).run(deptId, orgId);

    vi.clearAllMocks();
  });

  describe('getPeopleByDepartment', () => {
    it('should return all people for a department', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name, sort_order)
        VALUES ('person-1', ?, 'Person 1', 1), ('person-2', ?, 'Person 2', 2)
      `).run(deptId, deptId);

      const people = getPeopleByDepartment(deptId, userId);

      expect(people).toHaveLength(2);
      expect(people[0]?.name).toBe('Person 1');
      expect(people[1]?.name).toBe('Person 2');
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'viewer');
    });

    it('should not return deleted people', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name, deleted_at)
        VALUES ('person-1', ?, 'Person 1', datetime('now'))
      `).run(deptId);

      const people = getPeopleByDepartment(deptId, userId);

      expect(people).toHaveLength(0);
    });
  });

  describe('getPersonById', () => {
    it('should return a person by ID with department and organization details', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Person 1')
      `).run(deptId);

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
    it('should create a new person', () => {
      const person = createPerson(deptId, { name: 'New Person', title: 'Developer' }, userId);

      expect(person.name).toBe('New Person');
      expect(person.title).toBe('Developer');
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'editor');
    });
  });

  describe('updatePerson', () => {
    it('should update person details', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Old Name')
      `).run(deptId);

      const updated = updatePerson('person-1', { name: 'New Name' }, userId);

      expect(updated.name).toBe('New Name');
    });

    it('should move person to a different department', () => {
      const newDeptId = 'new-dept-id';
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES (?, ?, 'New Dept')
      `).run(newDeptId, orgId);

      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Person 1')
      `).run(deptId);

      const updated = updatePerson('person-1', { departmentId: newDeptId }, userId);

      expect(updated.departmentId).toBe(newDeptId);
    });
  });

  describe('deletePerson', () => {
    it('should soft delete a person', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', ?, 'Person 1')
      `).run(deptId);

      deletePerson('person-1', userId);

      const person = (db as DatabaseType).prepare('SELECT deleted_at FROM people WHERE id = ?').get('person-1') as { deleted_at: string };
      expect(person.deleted_at).not.toBeNull();
    });
  });
});
