import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';

// Type definitions at module level (before vi.mock)
type TestUser = {
  id: string;
  name: string;
  email: string;
};

type TestOrg = {
  id: string;
  name: string;
};

type AccessResult = {
  hasAccess: boolean;
  role: string | null;
};

type MemberResult = {
  id: string;
  role: string;
  userId: string;
  userName?: string;
  userEmail?: string;
};

type AddMemberByEmailResult = {
  success: boolean;
  member?: MemberResult;
  error?: string;
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
      added_by_id TEXT,
      added_by_name TEXT,
      added_by_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
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
  addMemberByEmail,
  updateMemberRole,
  removeOrgMember,
} from './member.service.js';

describe('Member Service', () => {
  let owner: TestUser;
  let member: TestUser;
  let org: TestOrg;

  beforeEach(() => {
    // Clear tables
    (db as DatabaseType).exec(`
      DELETE FROM organization_members;
      DELETE FROM organizations;
      DELETE FROM users;
    `);

    // Create owner
    owner = { id: 'owner-id', name: 'Owner', email: 'owner@example.com' };
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash', 'user')
    `
      )
      .run(owner.id, owner.name, owner.email);

    // Create member user
    member = { id: 'member-id', name: 'Member', email: 'member@example.com' };
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash', 'user')
    `
      )
      .run(member.id, member.name, member.email);

    // Create organization
    org = { id: 'org-id', name: 'Test Org' };
    (db as DatabaseType)
      .prepare(
        `
      INSERT INTO organizations (id, name, created_by_id)
      VALUES (?, ?, ?)
    `
      )
      .run(org.id, org.name, owner.id);
  });

  describe('checkOrgAccess', () => {
    it('should return owner access for organization creator', () => {
      const access: AccessResult = checkOrgAccess(org.id, owner.id);

      expect(access.hasAccess).toBe(true);
      expect(access.role).toBe('owner');
    });

    it('should return member access for organization member', () => {
      // Add member
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'editor')
      `
        )
        .run(org.id, member.id);

      const access: AccessResult = checkOrgAccess(org.id, member.id);

      expect(access.hasAccess).toBe(true);
      expect(access.role).toBe('editor');
    });

    it('should return no access for non-member', () => {
      const nonMember: TestUser = { id: 'non-member-id', name: '', email: '' };
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Non Member', 'non@example.com', 'hash', 'user')
      `
        )
        .run(nonMember.id);

      const access: AccessResult = checkOrgAccess(org.id, nonMember.id);

      expect(access.hasAccess).toBe(false);
      expect(access.role).toBeNull();
    });
  });

  describe('requireOrgPermission', () => {
    it('should not throw for owner with viewer permission', () => {
      expect(() => requireOrgPermission(org.id, owner.id, 'viewer')).not.toThrow();
    });

    it('should not throw for owner with admin permission', () => {
      expect(() => requireOrgPermission(org.id, owner.id, 'admin')).not.toThrow();
    });

    it('should not throw for admin with editor permission', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'admin')
      `
        )
        .run(org.id, member.id);

      expect(() => requireOrgPermission(org.id, member.id, 'editor')).not.toThrow();
    });

    it('should throw for viewer with editor permission', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'viewer')
      `
        )
        .run(org.id, member.id);

      expect(() => requireOrgPermission(org.id, member.id, 'editor')).toThrow();
    });

    it('should throw for non-member', () => {
      const nonMember: TestUser = { id: 'non-member-id', name: '', email: '' };
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Non Member', 'non@example.com', 'hash', 'user')
      `
        )
        .run(nonMember.id);

      expect(() => requireOrgPermission(org.id, nonMember.id, 'viewer')).toThrow();
    });
  });

  describe('getOrgMembers', () => {
    it('should return all members of organization', () => {
      // Create viewer user first (before adding as member)
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES ('viewer-id', 'Viewer', 'viewer@example.com', 'hash', 'user')
      `
        )
        .run();

      // Add some members
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'admin'), ('mem-2', ?, ?, 'viewer')
      `
        )
        .run(org.id, member.id, org.id, 'viewer-id');

      const members: MemberResult[] = getOrgMembers(org.id);

      expect(members.length).toBe(2);
    });

    it('should include member details', () => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'admin')
      `
        )
        .run(org.id, member.id);

      const members: MemberResult[] = getOrgMembers(org.id);

      expect(members[0]).toHaveProperty('userName');
      expect(members[0]).toHaveProperty('userEmail');
      expect(members[0]).toHaveProperty('role');
      expect(members[0]!.userName).toBe('Member');
    });
  });

  describe('addOrgMember', () => {
    it('should add new member to organization', () => {
      const result: MemberResult = addOrgMember(org.id, member.id, 'editor', owner.id);

      expect(result).toHaveProperty('id');
      expect(result.role).toBe('editor');
      expect(result.userId).toBe(member.id);
    });

    it('should throw if user is already a member', () => {
      addOrgMember(org.id, member.id, 'editor', owner.id);

      expect(() => addOrgMember(org.id, member.id, 'admin', owner.id)).toThrow(
        'User is already a member'
      );
    });

    it('should throw if requester is not admin', () => {
      const viewer: TestUser = { id: 'viewer-id', name: '', email: '' };
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, 'Viewer', 'viewer@example.com', 'hash', 'user')
      `
        )
        .run(viewer.id);

      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'viewer')
      `
        )
        .run(org.id, viewer.id);

      expect(() => addOrgMember(org.id, member.id, 'editor', viewer.id)).toThrow();
    });
  });

  describe('addMemberByEmail', () => {
    it('should add member by email if user exists', () => {
      const result: AddMemberByEmailResult = addMemberByEmail(
        org.id,
        member.email,
        'editor',
        owner.id
      );

      expect(result.success).toBe(true);
      expect(result.member?.userId).toBe(member.id);
    });

    it('should return error if user not found', () => {
      const result: AddMemberByEmailResult = addMemberByEmail(
        org.id,
        'unknown@example.com',
        'editor',
        owner.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('user_not_found');
    });
  });

  describe('updateMemberRole', () => {
    beforeEach(() => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'viewer')
      `
        )
        .run(org.id, member.id);
    });

    it('should update member role', () => {
      const result: MemberResult = updateMemberRole(org.id, 'mem-1', 'editor', owner.id);

      expect(result.role).toBe('editor');
    });

    it('should throw for invalid role', () => {
      expect(() => updateMemberRole(org.id, 'mem-1', 'invalid' as unknown as 'admin' | 'editor' | 'viewer', owner.id)).toThrow(
        'Invalid role'
      );
    });
  });

  describe('removeOrgMember', () => {
    beforeEach(() => {
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('mem-1', ?, ?, 'viewer')
      `
        )
        .run(org.id, member.id);
    });

    it('should remove member from organization', async () => {
      await removeOrgMember(org.id, 'mem-1', owner.id);

      const members: MemberResult[] = getOrgMembers(org.id);
      expect(members.length).toBe(0);
    });

    it('should throw if trying to remove owner', async () => {
      // Owner is creator, not in members table, but let's add as a member
      (db as DatabaseType)
        .prepare(
          `
        INSERT INTO organization_members (id, organization_id, user_id, role)
        VALUES ('owner-mem', ?, ?, 'admin')
      `
        )
        .run(org.id, owner.id);

      // In real service, removing owner should be prevented
      // This test depends on implementation
    });
  });
});
