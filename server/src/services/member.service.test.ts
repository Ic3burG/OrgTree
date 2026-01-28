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
      is_discoverable INTEGER DEFAULT 1,
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
      added_by_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (added_by_id) REFERENCES users(id),
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
  checkOrgAccess,
  requireOrgPermission,
  getOrgMembers,
  addOrgMember,
  updateMemberRole,
  removeOrgMember,
  addMemberByEmail,
  getUserOrganizations,
} from './member.service.js';

describe('Member Service', () => {
  const userId = 'user-1';
  const orgId = 'org-1';
  const otherUserId = 'user-2';

  beforeEach(() => {
    (db as DatabaseType).exec(`
      DELETE FROM audit_logs;
      DELETE FROM departments;
      DELETE FROM organization_members;
      DELETE FROM organizations;
      DELETE FROM users;
    `);

    // Setup basic users
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, 'User One', 'user1@example.com', 'hash', 'user')
    `
      )
      .run(userId);

    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, 'User Two', 'user2@example.com', 'hash', 'user')
    `
      )
      .run(otherUserId);

    // Setup basic organization owned by userId
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO organizations (id, name, created_by_id)
      VALUES (?, 'Test Org', ?)
    `
      )
      .run(orgId, userId);
  });

  describe('checkOrgAccess', () => {
    it('should return owner access for the creator', () => {
      const result = checkOrgAccess(orgId, userId);
      expect(result).toEqual({
        hasAccess: true,
        role: 'owner',
        isOwner: true,
      });
    });

    it('should return no access for non-member', () => {
      const result = checkOrgAccess(orgId, otherUserId);
      expect(result).toEqual({
        hasAccess: false,
        role: null,
        isOwner: false,
      });
    });

    it('should return correct role for a member', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id)
        VALUES ('mem-1', ?, ?, 'admin', ?)
      `
        )
        .run(orgId, otherUserId, userId);

      const result = checkOrgAccess(orgId, otherUserId);
      expect(result).toEqual({
        hasAccess: true,
        role: 'admin',
        isOwner: false,
      });
    });

    it('should return owner access for superuser regardless of membership', () => {
      const superUserId = 'super-1';
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Super User', 'super@example.com', 'hash', 'superuser')
      `
        )
        .run(superUserId);

      const result = checkOrgAccess(orgId, superUserId);
      expect(result).toEqual({
        hasAccess: true,
        role: 'owner',
        isOwner: false, // Not the actual creator
      });
    });

    it('should return false if organization does not exist', () => {
      const result = checkOrgAccess('non-existent', userId);
      expect(result.hasAccess).toBe(false);
    });
  });

  describe('requireOrgPermission', () => {
    it('should succeed if user has sufficient permission', () => {
      const result = requireOrgPermission(orgId, userId, 'viewer');
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe('owner');
    });

    it('should throw 404 if organization does not exist', () => {
      try {
        requireOrgPermission('non-existent', userId);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
        expect(err.message).toBe('Organization not found');
      }
    });

    it('should throw 403 if user has insufficient permission', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id)
        VALUES ('mem-1', ?, ?, 'viewer', ?)
      `
        )
        .run(orgId, otherUserId, userId);

      try {
        requireOrgPermission(orgId, otherUserId, 'admin');
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(403);
        expect(err.message).toBe('Insufficient permissions');
      }
    });

    it('should log audit record for permission denial', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id)
        VALUES ('mem-1', ?, ?, 'viewer', ?)
      `
        )
        .run(orgId, otherUserId, userId);

      try {
        requireOrgPermission(orgId, otherUserId, 'admin');
      } catch {
        // Expected to throw
      }

      const logs = (db as DatabaseType).prepare('SELECT * FROM audit_logs').all();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toMatchObject({
        organization_id: orgId,
        action_type: 'permission_denied',
      });
    });
  });

  describe('member management', () => {
    beforeEach(() => {
      // Add otherUserId as admin
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id)
        VALUES ('mem-1', ?, ?, 'admin', ?)
      `
        )
        .run(orgId, otherUserId, userId);
    });

    it('getOrgMembers should return all members with user details', () => {
      const members = getOrgMembers(orgId);
      expect(members).toHaveLength(1);
      expect(members[0]).toMatchObject({
        user_id: otherUserId,
        role: 'admin',
        userName: 'User Two',
      });
      expect(members[0]?.user).toMatchObject({
        id: otherUserId,
        name: 'User Two',
      });
    });

    it('addOrgMember should add a new member', () => {
      const newUserId = 'user-3';
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'New User', 'new@example.com', 'hash', 'user')
      `
        )
        .run(newUserId);

      const member = addOrgMember(orgId, newUserId, 'editor', userId);
      expect(member).toMatchObject({
        user_id: newUserId,
        role: 'editor',
      });

      const count = (db as DatabaseType)
        .prepare('SELECT COUNT(*) as count FROM organization_members WHERE user_id = ?')
        .get(newUserId) as { count: number };
      expect(count.count).toBe(1);
    });

    it('addOrgMember should fail if added by unauthorized user', () => {
      const viewerId = 'viewer-1';
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Viewer', 'viewer@example.com', 'hash', 'user')
      `
        )
        .run(viewerId);
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id)
        VALUES ('mem-v', ?, ?, 'viewer', ?)
      `
        )
        .run(orgId, viewerId, userId);

      expect(() => addOrgMember(orgId, 'user-3', 'editor', viewerId)).toThrow();
    });

    it('updateMemberRole should update a member role', () => {
      const updated = updateMemberRole(orgId, 'mem-1', 'editor', userId);
      expect(updated.role).toBe('editor');

      const stored = (db as DatabaseType)
        .prepare('SELECT role FROM organization_members WHERE id = ?')
        .get('mem-1') as { role: string };
      expect(stored.role).toBe('editor');
    });

    it('removeOrgMember should delete a member', () => {
      const result = removeOrgMember(orgId, 'mem-1', userId);
      expect(result.success).toBe(true);

      const stored = (db as DatabaseType)
        .prepare('SELECT * FROM organization_members WHERE id = ?')
        .get('mem-1');
      expect(stored).toBeUndefined();
    });

    it('addMemberByEmail should find user and add as member', () => {
      const newUserId = 'user-3';
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Email User', 'email@example.com', 'hash', 'user')
      `
        )
        .run(newUserId);

      const result = addMemberByEmail(orgId, 'email@example.com', 'viewer', userId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.member.user_id).toBe(newUserId);
      }
    });

    it('addMemberByEmail should return user_not_found error', () => {
      const result = addMemberByEmail(orgId, 'non-existent@example.com', 'viewer', userId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('user_not_found');
      }
    });
  });

  describe('getUserOrganizations', () => {
    it('should return both owned and member organizations', () => {
      const otherOrgId = 'org-2';
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organizations (id, name, created_by_id)
        VALUES (?, 'Other Org', ?)
      `
        )
        .run(otherOrgId, otherUserId);

      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id)
        VALUES ('mem-2', ?, ?, 'editor', ?)
      `
        )
        .run(otherOrgId, userId, otherUserId);

      const orgs = getUserOrganizations(userId);
      expect(orgs).toHaveLength(2);
      expect(orgs.some(o => o.role === 'owner' && o.id === orgId)).toBe(true);
      expect(orgs.some(o => o.role === 'editor' && o.id === otherOrgId)).toBe(true);
    });

    it('should include department count in organization info', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO departments (id, organization_id, name)
        VALUES ('dept-1', ?, 'Dept 1')
      `
        )
        .run(orgId);

      const orgs = getUserOrganizations(userId);
      expect(orgs[0]?.departments.length).toBe(1);
    });
  });
});
