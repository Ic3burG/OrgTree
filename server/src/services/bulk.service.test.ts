import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { setupTestDatabase } from '../test-helpers/test-db-schema.js';

// Create a stateful mock for the database
let currentDb: DatabaseType;

vi.mock('../db.js', () => {
  return {
    default: new Proxy(
      {},
      {
        get: (_target, prop) => {
          const val = (currentDb as any)[prop];
          if (typeof val === 'function') {
            return val.bind(currentDb);
          }
          return val;
        },
      }
    ),
  };
});

// Mock dependencies
vi.mock('./socket-events.service.js', () => ({
  emitPersonDeleted: vi.fn(),
  emitPersonUpdated: vi.fn(),
  emitDepartmentDeleted: vi.fn(),
  emitDepartmentUpdated: vi.fn(),
}));

vi.mock('./custom-fields.service.js', () => ({
  setEntityCustomFields: vi.fn().mockResolvedValue(undefined),
}));

import {
  bulkDeletePeople,
  bulkMovePeople,
  bulkEditPeople,
  bulkDeleteDepartments,
  bulkEditDepartments,
} from './bulk.service.js';

describe('Bulk Operations Service', () => {
  const actor = { id: 'user-admin', name: 'Admin User' };
  const orgId = 'org-1';

  beforeEach(() => {
    // Fresh database for EVERY test
    currentDb = new Database(':memory:');
    setupTestDatabase(currentDb, { withFts: true, withTriggers: true });

    // Seed basic data
    currentDb
      .prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)')
      .run(actor.id, 'admin@example.com', 'hash', actor.name, 'admin');

    currentDb
      .prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)')
      .run(orgId, 'Test Org', actor.id);
  });

  describe('bulkDeletePeople', () => {
    it('should delete multiple people and return success', () => {
      const deptId = 'dept-1';
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(deptId, orgId, 'Dept 1');

      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name) VALUES (?, ?, ?, ?)'
        )
        .run('p1', deptId, orgId, 'Person 1');
      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name) VALUES (?, ?, ?, ?)'
        )
        .run('p2', deptId, orgId, 'Person 2');

      const result = bulkDeletePeople(orgId, ['p1', 'p2'], actor);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);

      const deletedCount = currentDb
        .prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NOT NULL')
        .get() as { count: number };
      expect(deletedCount.count).toBe(2);
    });

    it('should handle non-existent person ID', () => {
      const result = bulkDeletePeople(orgId, ['non-existent'], actor);
      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
    });

    it('should throw 400 for empty personId array', () => {
      expect(() => bulkDeletePeople(orgId, [], actor)).toThrow(/must be a non-empty array/);
    });

    it('should throw 400 for too many personIds', () => {
      const ids = Array.from({ length: 101 }, (_, i) => `p${i}`);
      expect(() => bulkDeletePeople(orgId, ids, actor)).toThrow(/more than 100/);
    });
  });

  describe('bulkMovePeople', () => {
    it('should move people to a new department', () => {
      const dept1 = 'dept-1';
      const dept2 = 'dept-2';
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(dept1, orgId, 'Dept 1');
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(dept2, orgId, 'Dept 2');

      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name) VALUES (?, ?, ?, ?)'
        )
        .run('p1', dept1, orgId, 'Person 1');

      const result = bulkMovePeople(orgId, ['p1'], dept2, actor);

      expect(result.success).toBe(true);
      const person = currentDb
        .prepare('SELECT department_id FROM people WHERE id = ?')
        .get('p1') as { department_id: string };
      expect(person.department_id).toBe(dept2);
    });

    it('should fail if people are already in target department', () => {
      const dept1 = 'dept-1';
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(dept1, orgId, 'Dept 1');
      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name) VALUES (?, ?, ?, ?)'
        )
        .run('p1', dept1, orgId, 'Person 1');

      const result = bulkMovePeople(orgId, ['p1'], dept1, actor);
      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('bulkEditPeople', () => {
    it('should update multiple fields for people including custom fields', async () => {
      const dept1 = 'dept-1';
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(dept1, orgId, 'Dept 1');
      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name, title) VALUES (?, ?, ?, ?, ?)'
        )
        .run('p1', dept1, orgId, 'Person 1', 'Old Title');

      const result = await bulkEditPeople(
        orgId,
        ['p1'],
        {
          title: 'New Title',
          email: 'new@example.com',
          phone: '555-0199',
          customFields: { test: 'value' },
        },
        actor
      );

      expect(result.success).toBe(true);
      const person = currentDb
        .prepare('SELECT title, email, phone FROM people WHERE id = ?')
        .get('p1') as any;
      expect(person.title).toBe('New Title');
      expect(person.email).toBe('new@example.com');
      expect(person.phone).toBe('555-0199');
    });

    it('should throw 400 if updates object is empty', async () => {
      try {
        await bulkEditPeople(orgId, ['p1'], {}, actor);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.status).toBe(400);
      }
    });

    it('should throw 400 if personIds is empty', async () => {
      try {
        await bulkEditPeople(orgId, [], { title: 'New' }, actor);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.status).toBe(400);
      }
    });

    it('should handle person not found during update', async () => {
      const result = await bulkEditPeople(orgId, ['non-existent'], { title: 'New' }, actor);
      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('bulkDeleteDepartments', () => {
    it('should delete departments and cascade delete sub-items', () => {
      const parentId = 'parent';
      const childId = 'child';
      const personId = 'person';

      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(parentId, orgId, 'Parent');
      currentDb
        .prepare(
          'INSERT INTO departments (id, organization_id, name, parent_id) VALUES (?, ?, ?, ?)'
        )
        .run(childId, orgId, 'Child', parentId);
      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name) VALUES (?, ?, ?, ?)'
        )
        .run(personId, childId, orgId, 'Person in child');

      currentDb
        .prepare(
          'INSERT INTO people (id, department_id, organization_id, name) VALUES (?, ?, ?, ?)'
        )
        .run('person-parent', parentId, orgId, 'Person in parent');

      const result = bulkDeleteDepartments(orgId, [parentId], actor);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('sub-department'))).toBe(true);
      expect(result.warnings.some(w => w.includes('person'))).toBe(true);
    });

    it('should ignore already deleted departments', () => {
      const d1 = 'd1';
      currentDb
        .prepare(
          'INSERT INTO departments (id, organization_id, name, deleted_at) VALUES (?, ?, ?, ?)'
        )
        .run(d1, orgId, 'D1', '2023-01-01');

      const result = bulkDeleteDepartments(orgId, [d1], actor);
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('bulkEditDepartments', () => {
    it('should re-parent departments', () => {
      const d1 = 'd1';
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(d1, orgId, 'D1');

      const result = bulkEditDepartments(orgId, [d1], { parentId: null }, actor);
      expect(result.success).toBe(true);
    });

    it('should handle circular reference check with deep hierarchy', () => {
      const d1 = 'd1';
      const d2 = 'd2';
      const d3 = 'd3';
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run(d1, orgId, 'D1');
      currentDb
        .prepare(
          'INSERT INTO departments (id, organization_id, name, parent_id) VALUES (?, ?, ?, ?)'
        )
        .run(d2, orgId, 'D2', d1);
      currentDb
        .prepare(
          'INSERT INTO departments (id, organization_id, name, parent_id) VALUES (?, ?, ?, ?)'
        )
        .run(d3, orgId, 'D3', d2);

      // Try to make d1 (ancestor) a child of d3 (descendant)
      const result = bulkEditDepartments(orgId, [d1], { parentId: d3 }, actor);
      expect(result.success).toBe(false);
      expect(result.failed[0].error).toContain('descendant');
    });

    it('should throw 400 if self-parenting', () => {
      currentDb
        .prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)')
        .run('d1', orgId, 'D1');
      expect(() => bulkEditDepartments(orgId, ['d1'], { parentId: 'd1' }, actor)).toThrow(
        /own parent/
      );
    });

    it('should handle department not found during update', () => {
      const result = bulkEditDepartments(orgId, ['non-existent'], { parentId: null }, actor);
      expect(result.success).toBe(false);
    });
  });
});
