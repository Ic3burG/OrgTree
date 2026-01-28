import { vi, describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as ownershipService from './ownership-transfer.service.js';

// Mock DB to use memory
vi.mock('../db.js', async () => {
  const { initializeDatabase } = await import('../db-init.js');
  const db = new Database(':memory:');
  await initializeDatabase(db);
  return { default: db };
});

import db from '../db.js';

describe('Ownership Transfer Security', () => {
  const orgId = 'org-1';
  const ownerId = 'user-owner';
  const memberId = 'user-member';
  const otherUserId = 'user-other';
  const superuserId = 'user-superuser';

  beforeEach(async () => {
    // Clear tables in correct order
    const tables = [
      'ownership_transfer_audit_log',
      'ownership_transfers',
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

    // Setup Users
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(ownerId, 'owner@example.com', 'hash', 'Owner', 'admin');
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(memberId, 'member@example.com', 'hash', 'Member', 'user');
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(otherUserId, 'other@example.com', 'hash', 'Other', 'user');
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(superuserId, 'superuser@example.com', 'hash', 'Super', 'superuser');

    // Setup Org
    db.prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)').run(
      orgId,
      'Test Org',
      ownerId
    );

    // Add member
    db.prepare(
      'INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id) VALUES (?, ?, ?, ?, ?)'
    ).run('mem-1', orgId, memberId, 'admin', ownerId);
  });

  describe('Initiation Permissions', () => {
    it('should NOT allow a regular member to initiate transfer', () => {
      expect(() => {
        ownershipService.initiateTransfer(orgId, memberId, otherUserId, 'I want to be owner');
      }).toThrow();
    });

    it('should NOT allow a non-member to initiate transfer', () => {
      expect(() => {
        ownershipService.initiateTransfer(orgId, otherUserId, memberId, 'I want to steal it');
      }).toThrow();
    });

    it('should NOT allow a superuser (non-owner) to initiate transfer', () => {
      // This verifies the strictness I found in the code
      expect(() => {
        ownershipService.initiateTransfer(orgId, superuserId, memberId, 'Superuser override');
      }).toThrow(/Only Organization Owners/);
    });

    it('should allow the actual owner to initiate', () => {
      const transfer = ownershipService.initiateTransfer(
        orgId,
        ownerId,
        memberId,
        'Succession planning 101'
      );
      expect(transfer.status).toBe('pending');
    });
  });

  describe('Acceptance Permissions', () => {
    let transferId: string;

    beforeEach(() => {
      const transfer = ownershipService.initiateTransfer(
        orgId,
        ownerId,
        memberId,
        'Succession planning 101'
      );
      transferId = transfer.id;
    });

    it('should NOT allow the owner to accept their own transfer (self-acceptance)', () => {
      // Note: recipient must be the one accepting
      expect(() => {
        ownershipService.acceptTransfer(transferId, ownerId);
      }).toThrow(/Only the designated recipient/);
    });

    it('should NOT allow a third party to accept the transfer', () => {
      expect(() => {
        ownershipService.acceptTransfer(transferId, otherUserId);
      }).toThrow(/Only the designated recipient/);
    });

    it('should NOT allow a superuser to accept on behalf of recipient', () => {
      expect(() => {
        ownershipService.acceptTransfer(transferId, superuserId);
      }).toThrow(/Only the designated recipient/);
    });

    it('should allow the recipient to accept', () => {
      const result = ownershipService.acceptTransfer(transferId, memberId);
      expect(result.status).toBe('accepted');

      // Verify DB state change
      const org = db
        .prepare('SELECT created_by_id FROM organizations WHERE id = ?')
        .get(orgId) as any;
      expect(org.created_by_id).toBe(memberId);

      // Verify old owner is now admin
      const oldOwnerMember = db
        .prepare('SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?')
        .get(orgId, ownerId) as any;
      expect(oldOwnerMember.role).toBe('admin');
    });
  });
});
