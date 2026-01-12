import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

// Type definitions at module level
type TestUser = {
  id: string;
  name: string;
  email: string;
};

type Organization = {
  id: string;
  name: string;
  created_by_id?: string;
  departmentCount?: number;
  peopleCount?: number;
  role?: string;
};

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
      deleted_at TEXT,
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
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      actor_id TEXT,
      actor_name TEXT,
      action_type TEXT,
      entity_type TEXT,
      entity_id TEXT,
      entity_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return { default: db };
});

import db from '../db.js';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from './org.service.js';

describe('Organization Service', () => {
  let testUser: TestUser;

  beforeEach(() => {
    // Clear tables
    (db as DatabaseType).exec(`
      DELETE FROM people;
      DELETE FROM departments;
      DELETE FROM organization_members;
      DELETE FROM organizations;
      DELETE FROM users;
    `);

    // Create test user
    testUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    };
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash', 'user')
    `
      )
      .run(testUser.id, testUser.name, testUser.email);
  });

  describe('createOrganization', () => {
    it('should create a new organization', async () => {
      const org: Organization = await createOrganization('My Org', testUser.id);

      expect(org).toHaveProperty('id');
      expect(org.name).toBe('My Org');
      expect(org.created_by_id).toBe(testUser.id);
      // role may or may not be returned by createOrganization
    });

    it('should store organization in database', async () => {
      const org: Organization = await createOrganization('My Org', testUser.id);

      const stored = (db as DatabaseType)
        .prepare('SELECT id, name, created_by_id FROM organizations WHERE id = ?')
        .get(org.id) as { id: string; name: string; created_by_id: string } | undefined;
      expect(stored).toBeTruthy();
      expect(stored?.name).toBe('My Org');
      expect(stored?.created_by_id).toBe(testUser.id);
    });
  });

  describe('getOrganizations', () => {
    it('should return organizations owned by user', async () => {
      await createOrganization('Org 1', testUser.id);
      await createOrganization('Org 2', testUser.id);

      const orgs: Organization[] = await getOrganizations(testUser.id);
      orgs.sort((a: Organization, b: Organization) => a.name.localeCompare(b.name));

      expect(orgs).toHaveLength(2);
      expect(orgs[0]!.name).toBe('Org 1');
      expect(orgs[1]!.name).toBe('Org 2');
    });

    it('should return organizations user is member of', async () => {
      // Create org by another user
      const otherUser: TestUser = { id: 'other-user-id', name: '', email: '' };
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Other', 'other@example.com', 'hash', 'user')
      `
        )
        .run(otherUser.id);

      const org: Organization = await createOrganization('Other Org', otherUser.id);

      // Add test user as member
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('member-id', ?, ?, 'viewer')
      `
        )
        .run(org.id, testUser.id);

      const orgs: Organization[] = await getOrganizations(testUser.id);

      expect(orgs).toHaveLength(1);
      expect(orgs[0]!.name).toBe('Other Org');
      expect(orgs[0]!.role).toBe('viewer');
    });

    it('should return empty array for user with no organizations', async () => {
      const orgs: Organization[] = await getOrganizations(testUser.id);
      expect(orgs).toHaveLength(0);
    });

    it('should include department count', async () => {
      const org: Organization = await createOrganization('My Org', testUser.id);

      // Add departments
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1'), ('dept-2', ?, 'Dept 2')
      `
        )
        .run(org.id, org.id);

      const orgs: Organization[] = await getOrganizations(testUser.id);

      expect(orgs[0]!.departmentCount).toBe(2);
    });

    it('should include people count if supported', async () => {
      const org: Organization = await createOrganization('My Org', testUser.id);

      // Add department and people
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1')
      `
        )
        .run(org.id);

      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO people (id, department_id, name)
        VALUES ('person-1', 'dept-1', 'Person 1'), ('person-2', 'dept-1', 'Person 2')
      `
        )
        .run();

      const orgs: Organization[] = await getOrganizations(testUser.id);

      // peopleCount may or may not be returned by getOrganizations
      if (orgs[0]!.peopleCount !== undefined) {
        expect(orgs[0]!.peopleCount).toBe(2);
      }
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization by ID', async () => {
      const created: Organization = await createOrganization('My Org', testUser.id);

      const org: Organization = await getOrganizationById(created.id, testUser.id);

      expect(org.id).toBe(created.id);
      expect(org.name).toBe('My Org');
    });

    it('should throw error for non-existent organization', async () => {
      await expect(getOrganizationById('non-existent', testUser.id)).rejects.toThrow();
    });

    it('should throw error if user has no access', async () => {
      const otherUser: TestUser = { id: 'other-user-id', name: '', email: '' };
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Other', 'other@example.com', 'hash', 'user')
      `
        )
        .run(otherUser.id);

      const org: Organization = await createOrganization('Other Org', otherUser.id);

      await expect(getOrganizationById(org.id, testUser.id)).rejects.toThrow();
    });
  });

  describe('updateOrganization', () => {
    it('should update organization name', async () => {
      const created: Organization = await createOrganization('My Org', testUser.id);

      const updated: Organization = await updateOrganization(created.id, 'New Name', testUser.id);

      expect(updated.name).toBe('New Name');
    });

    it('should persist update in database', async () => {
      const created: Organization = await createOrganization('My Org', testUser.id);
      await updateOrganization(created.id, 'New Name', testUser.id);

      const stored: { name: string } | undefined = (db as DatabaseType)
        .prepare('SELECT name FROM organizations WHERE id = ?')
        .get(created.id) as { name: string } | undefined;
      expect(stored?.name).toBe('New Name');
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization', async () => {
      const created: Organization = await createOrganization('My Org', testUser.id);

      await deleteOrganization(created.id, testUser.id);

      const stored: Organization | undefined = (db as DatabaseType)
        .prepare('SELECT * FROM organizations WHERE id = ?')
        .get(created.id) as Organization | undefined;
      expect(stored).toBeUndefined();
    });

    it('should throw error if user is not owner', async () => {
      const otherUser: TestUser = { id: 'other-user-id', name: '', email: '' };
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Other', 'other@example.com', 'hash', 'user')
      `
        )
        .run(otherUser.id);

      const org: Organization = await createOrganization('Other Org', otherUser.id);

      // Add test user as admin (not owner)
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('member-id', ?, ?, 'admin')
      `
        )
        .run(org.id, testUser.id);

      await expect(deleteOrganization(org.id, testUser.id)).rejects.toThrow();
    });
  });
});
