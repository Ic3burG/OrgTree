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
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.service.js';

describe('Department Service', () => {
  const orgId = 'test-org-id';
  const userId = 'test-user-id';

  beforeEach(() => {
    // Clear tables
    (db as DatabaseType).exec(`
      DELETE FROM people;
      DELETE FROM departments;
      DELETE FROM organization_members;
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

    vi.clearAllMocks();
  });

  describe('getDepartments', () => {
    it('should return all departments for an organization', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name, sort_order)
        VALUES ('dept-1', ?, 'Dept 1', 1), ('dept-2', ?, 'Dept 2', 2)
      `).run(orgId, orgId);

      const depts = getDepartments(orgId, userId);

      expect(depts).toHaveLength(2);
      expect(depts[0]?.name).toBe('Dept 1');
      expect(depts[1]?.name).toBe('Dept 2');
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'viewer');
    });

    it('should include people in departments', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1')
      `).run(orgId);

      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', 'dept-1', 'Person 1')
      `).run();

      const depts = getDepartments(orgId, userId);

      expect(depts[0]?.people).toHaveLength(1);
      expect(depts[0]?.people[0]?.name).toBe('Person 1');
    });

    it('should not return deleted departments', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name, deleted_at)
        VALUES ('dept-1', ?, 'Dept 1', datetime('now'))
      `).run(orgId);

      const depts = getDepartments(orgId, userId);

      expect(depts).toHaveLength(0);
    });
  });

  describe('getDepartmentById', () => {
    it('should return a department by ID', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1')
      `).run(orgId);

      const dept = getDepartmentById(orgId, 'dept-1', userId);

      expect(dept.id).toBe('dept-1');
      expect(dept.name).toBe('Dept 1');
    });

    it('should throw 404 if department not found', () => {
      expect(() => getDepartmentById(orgId, 'non-existent', userId)).toThrow('Department not found');
    });
  });

  describe('createDepartment', () => {
    it('should create a new department', () => {
      const dept = createDepartment(orgId, { name: 'New Dept', description: 'Desc' }, userId);

      expect(dept.name).toBe('New Dept');
      expect(dept.description).toBe('Desc');
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'editor');
    });

    it('should create a department with a parent', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('parent-id', ?, 'Parent')
      `).run(orgId);

      const dept = createDepartment(orgId, { name: 'Child', parentId: 'parent-id' }, userId);

      expect(dept.parentId).toBe('parent-id');
    });

    it('should throw if parent department does not exist', () => {
      expect(() => 
        createDepartment(orgId, { name: 'Child', parentId: 'non-existent' }, userId)
      ).toThrow('Parent department not found');
    });
  });

  describe('updateDepartment', () => {
    it('should update department details', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Old Name')
      `).run(orgId);

      const updated = updateDepartment(orgId, 'dept-1', { name: 'New Name' }, userId);

      expect(updated.name).toBe('New Name');
    });

    it('should change parent department', () => {
       (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1'), ('dept-2', ?, 'Dept 2')
      `).run(orgId, orgId);

      const updated = updateDepartment(orgId, 'dept-1', { parentId: 'dept-2' }, userId);

      expect(updated.parentId).toBe('dept-2');
    });

    it('should move to top level if parentId is null', () => {
       (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('parent-id', ?, 'Parent')
      `).run(orgId);
       (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name, parent_id)
        VALUES ('dept-1', ?, 'Dept 1', 'parent-id')
      `).run(orgId);

      const updated = updateDepartment(orgId, 'dept-1', { parentId: null }, userId);

      expect(updated.parentId).toBeNull();
    });

    it('should throw if moving under itself', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1')
      `).run(orgId);

      expect(() => 
        updateDepartment(orgId, 'dept-1', { parentId: 'dept-1' }, userId)
      ).toThrow('Department cannot be its own parent');
    });
  });

  describe('deleteDepartment', () => {
    it('should soft delete a department', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1')
      `).run(orgId);

      deleteDepartment(orgId, 'dept-1', userId);

      const dept = (db as DatabaseType).prepare('SELECT deleted_at FROM departments WHERE id = ?').get('dept-1') as { deleted_at: string };
      expect(dept.deleted_at).not.toBeNull();
    });

    it('should recursively delete children', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name) VALUES ('parent', ?, 'Parent')
      `).run(orgId);
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name, parent_id) VALUES ('child', ?, 'Child', 'parent')
      `).run(orgId);

      deleteDepartment(orgId, 'parent', userId);

      const child = (db as DatabaseType).prepare('SELECT deleted_at FROM departments WHERE id = ?').get('child') as { deleted_at: string };
      expect(child.deleted_at).not.toBeNull();
    });

    it('should soft delete people in the department', () => {
      (db as DatabaseType).prepare(`
        INSERT INTO departments (id, organization_id, name) VALUES ('dept-1', ?, 'Dept 1')
      `).run(orgId);
      (db as DatabaseType).prepare(`
        INSERT INTO people (id, department_id, name) VALUES ('person-1', 'dept-1', 'Person 1')
      `).run();

      deleteDepartment(orgId, 'dept-1', userId);

      const person = (db as DatabaseType).prepare('SELECT deleted_at FROM people WHERE id = ?').get('person-1') as { deleted_at: string };
      expect(person.deleted_at).not.toBeNull();
    });
  });
});
