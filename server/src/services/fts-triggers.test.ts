import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { setupTestDatabase } from '../test-helpers/test-db-schema.js';

/**
 * Tests for Phase 3.2: Trigger Integration Tests
 *
 * This test suite verifies that database triggers properly sync FTS indexes
 * on CRUD operations, including soft deletes.
 */

describe('FTS Trigger Integration Tests (Phase 3.2)', () => {
  let db: DatabaseType;
  let orgId: string;
  let userId: string;
  let deptId: string;
  let personId: string;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = new Database(':memory:');

    // Setup schema with triggers
    setupTestDatabase(db, {
      withFts: true,
      withTriggers: true,
      withIndexes: false,
    });

    // Setup test data
    orgId = 'org1';
    userId = 'user1';
    deptId = 'dept1';
    personId = 'person1';

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      userId,
      'test@example.com',
      'hash',
      'Test User'
    );

    db.prepare(
      'INSERT INTO organizations (id, name, created_by_id, is_public) VALUES (?, ?, ?, ?)'
    ).run(orgId, 'Test Org', userId, 0);

    db.prepare('INSERT INTO org_members (organization_id, user_id, role) VALUES (?, ?, ?)').run(
      orgId,
      userId,
      'owner'
    );
  });

  describe('Department FTS Triggers', () => {
    describe('INSERT trigger', () => {
      it('should add department to FTS on insert', () => {
        // Insert department
        db.prepare(
          'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
        ).run(deptId, orgId, 'Engineering', 'Tech team');

        // Verify FTS entry was created
        const ftsResult = db
          .prepare(
            "SELECT rowid, name, description FROM departments_fts WHERE departments_fts MATCH 'Engineering'"
          )
          .get() as { rowid: number; name: string; description: string } | undefined;

        expect(ftsResult).toBeDefined();
        expect(ftsResult?.name).toBe('Engineering');
        expect(ftsResult?.description).toBe('Tech team');
      });

      it('should NOT add soft-deleted department to FTS on insert', () => {
        // Insert soft-deleted department
        db.prepare(
          'INSERT INTO departments (id, organization_id, name, description, deleted_at) VALUES (?, ?, ?, ?, ?)'
        ).run(deptId, orgId, 'Engineering', 'Tech team', new Date().toISOString());

        // Verify FTS entry was NOT created by searching for the name
        // NOTE: Can't use WHERE rowid = ? with content='departments' as it fetches from content table
        const ftsResult = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .all();

        // Should find no results since the department is soft-deleted
        expect(ftsResult).toHaveLength(0);
      });
    });

    describe('UPDATE trigger', () => {
      beforeEach(() => {
        // Insert test department
        db.prepare(
          'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
        ).run(deptId, orgId, 'Engineering', 'Tech team');
      });

      it('should update FTS entry when department is updated', () => {
        // Update department
        db.prepare('UPDATE departments SET name = ?, description = ? WHERE id = ?').run(
          'Product Engineering',
          'Product tech team',
          deptId
        );

        // Verify FTS was updated
        const ftsResult = db
          .prepare(
            "SELECT name, description FROM departments_fts WHERE departments_fts MATCH 'Product'"
          )
          .get() as { name: string; description: string };

        expect(ftsResult.name).toBe('Product Engineering');
        expect(ftsResult.description).toBe('Product tech team');
      });

      it('should remove FTS entry when department is soft-deleted', () => {
        // Verify FTS entry exists before soft delete using MATCH
        const ftsBefore = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .all();
        expect(ftsBefore).toHaveLength(1);

        // Soft delete department
        db.prepare('UPDATE departments SET deleted_at = ? WHERE id = ?').run(
          new Date().toISOString(),
          deptId
        );

        // Verify FTS entry was removed using MATCH
        const ftsAfter = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .all();

        expect(ftsAfter).toHaveLength(0);
      });

      it('should re-add FTS entry when department is un-deleted', () => {
        // Soft delete department
        db.prepare('UPDATE departments SET deleted_at = ? WHERE id = ?').run(
          new Date().toISOString(),
          deptId
        );

        // Verify FTS entry was removed using MATCH
        const ftsDeleted = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .all();
        expect(ftsDeleted).toHaveLength(0);

        // Un-delete department
        db.prepare('UPDATE departments SET deleted_at = NULL WHERE id = ?').run(deptId);

        // Verify FTS entry was re-added using MATCH
        const ftsRestored = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .all();

        expect(ftsRestored).toHaveLength(1);
        expect(ftsRestored[0]).toBeDefined();
      });
    });

    describe('DELETE trigger', () => {
      beforeEach(() => {
        // Insert test department
        db.prepare(
          'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
        ).run(deptId, orgId, 'Engineering', 'Tech team');
      });

      it('should remove FTS entry when department is hard-deleted', () => {
        // Verify FTS entry exists
        const ftsBefore = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .get();
        expect(ftsBefore).toBeDefined();

        // Hard delete department
        db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);

        // Verify FTS entry was removed
        const ftsAfter = db
          .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Engineering'")
          .get();

        expect(ftsAfter).toBeUndefined();
      });
    });
  });

  describe('People FTS Triggers', () => {
    beforeEach(() => {
      // Create department for people
      db.prepare(
        'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
      ).run(deptId, orgId, 'Engineering', 'Tech team');
    });

    describe('INSERT trigger', () => {
      it('should add person to FTS on insert', () => {
        // Insert person
        db.prepare(
          'INSERT INTO people (id, organization_id, department_id, name, title, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(personId, orgId, deptId, 'John Doe', 'Engineer', 'john@example.com', '555-1234');

        // Verify FTS entry was created
        const ftsResult = db
          .prepare("SELECT name, title, email, phone FROM people_fts WHERE people_fts MATCH 'John'")
          .get() as { name: string; title: string; email: string; phone: string } | undefined;

        expect(ftsResult).toBeDefined();
        expect(ftsResult?.name).toBe('John Doe');
        expect(ftsResult?.title).toBe('Engineer');
        expect(ftsResult?.email).toBe('john@example.com');
        expect(ftsResult?.phone).toBe('555-1234');
      });

      it('should NOT add soft-deleted person to FTS on insert', () => {
        // Insert soft-deleted person
        db.prepare(
          'INSERT INTO people (id, organization_id, department_id, name, title, deleted_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(personId, orgId, deptId, 'John Doe', 'Engineer', new Date().toISOString());

        // Verify FTS entry was NOT created by searching for the name
        // NOTE: Can't use WHERE rowid = ? with content='people' as it fetches from content table
        const ftsResult = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .all();

        // Should find no results since the person is soft-deleted
        expect(ftsResult).toHaveLength(0);
      });
    });

    describe('UPDATE trigger', () => {
      beforeEach(() => {
        // Insert test person
        db.prepare(
          'INSERT INTO people (id, organization_id, department_id, name, title, email) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(personId, orgId, deptId, 'John Doe', 'Engineer', 'john@example.com');
      });

      it('should update FTS entry when person is updated', () => {
        // Update person
        db.prepare('UPDATE people SET title = ?, email = ? WHERE id = ?').run(
          'Senior Engineer',
          'john.doe@example.com',
          personId
        );

        // Verify FTS was updated
        const ftsResult = db
          .prepare("SELECT title, email FROM people_fts WHERE people_fts MATCH 'Senior'")
          .get() as { title: string; email: string };

        expect(ftsResult.title).toBe('Senior Engineer');
        expect(ftsResult.email).toBe('john.doe@example.com');
      });

      it('should remove FTS entry when person is soft-deleted', () => {
        // Verify FTS entry exists before soft delete using MATCH
        const ftsBefore = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .all();
        expect(ftsBefore).toHaveLength(1);

        // Soft delete person
        db.prepare('UPDATE people SET deleted_at = ? WHERE id = ?').run(
          new Date().toISOString(),
          personId
        );

        // Verify FTS entry was removed using MATCH
        const ftsAfter = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .all();

        expect(ftsAfter).toHaveLength(0);
      });

      it('should re-add FTS entry when person is un-deleted', () => {
        // Soft delete person
        db.prepare('UPDATE people SET deleted_at = ? WHERE id = ?').run(
          new Date().toISOString(),
          personId
        );

        // Verify FTS entry was removed using MATCH
        const ftsDeleted = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .all();
        expect(ftsDeleted).toHaveLength(0);

        // Un-delete person
        db.prepare('UPDATE people SET deleted_at = NULL WHERE id = ?').run(personId);

        // Verify FTS entry was re-added using MATCH
        const ftsRestored = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .all();

        expect(ftsRestored).toHaveLength(1);
        expect(ftsRestored[0]).toBeDefined();
      });
    });

    describe('DELETE trigger', () => {
      beforeEach(() => {
        // Insert test person
        db.prepare(
          'INSERT INTO people (id, organization_id, department_id, name, title) VALUES (?, ?, ?, ?, ?)'
        ).run(personId, orgId, deptId, 'John Doe', 'Engineer');
      });

      it('should remove FTS entry when person is hard-deleted', () => {
        // Verify FTS entry exists
        const ftsBefore = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .get();
        expect(ftsBefore).toBeDefined();

        // Hard delete person
        db.prepare('DELETE FROM people WHERE id = ?').run(personId);

        // Verify FTS entry was removed
        const ftsAfter = db
          .prepare("SELECT rowid FROM people_fts WHERE people_fts MATCH 'John'")
          .get();

        expect(ftsAfter).toBeUndefined();
      });
    });
  });

  describe('FTS Sync Consistency', () => {
    it('should maintain correct FTS count after multiple operations', () => {
      // Insert 5 departments (3 active, 2 soft-deleted)
      for (let i = 1; i <= 5; i++) {
        const deletedAt = i > 3 ? new Date().toISOString() : null;
        db.prepare(
          'INSERT INTO departments (id, organization_id, name, description, deleted_at) VALUES (?, ?, ?, ?, ?)'
        ).run(`dept${i}`, orgId, `Dept ${i}`, `Description ${i}`, deletedAt);
      }

      // Verify FTS has only 3 entries (non-deleted)
      // NOTE: COUNT(*) with content='departments' returns content table count, not index count
      // So we search for "Dept" (which all departments match) to get actual indexed count
      const ftsResults = db
        .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Dept'")
        .all();
      expect(ftsResults).toHaveLength(3);

      // Soft delete one more
      db.prepare('UPDATE departments SET deleted_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        'dept1'
      );

      // Verify FTS now has 2 entries
      const ftsResultsAfterDelete = db
        .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Dept'")
        .all();
      expect(ftsResultsAfterDelete).toHaveLength(2);

      // Un-delete one
      db.prepare('UPDATE departments SET deleted_at = NULL WHERE id = ?').run('dept4');

      // Verify FTS now has 3 entries again
      const ftsResultsAfterRestore = db
        .prepare("SELECT rowid FROM departments_fts WHERE departments_fts MATCH 'Dept'")
        .all();
      expect(ftsResultsAfterRestore).toHaveLength(3);
    });

    it('should handle rapid updates without losing sync', () => {
      // Insert department
      db.prepare(
        'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
      ).run(deptId, orgId, 'Engineering', 'Initial description');

      // Perform 10 rapid updates
      for (let i = 1; i <= 10; i++) {
        db.prepare('UPDATE departments SET description = ? WHERE id = ?').run(
          `Updated description ${i}`,
          deptId
        );
      }

      // Verify FTS has the latest update
      const ftsResult = db
        .prepare("SELECT description FROM departments_fts WHERE departments_fts MATCH 'Updated'")
        .get() as { description: string };

      expect(ftsResult.description).toBe('Updated description 10');

      // Verify there's only one FTS entry (no duplicates)
      const ftsCount = db
        .prepare('SELECT COUNT(*) as count FROM departments_fts_docsize')
        .get() as { count: number };
      expect(ftsCount.count).toBe(1);
    });
  });
});
