import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { setupTestDatabase } from '../test-helpers/test-db-schema.js';

/**
 * Tests for Phase 3.3: Custom Fields FTS Tests
 *
 * This test suite verifies:
 * - Searchable vs non-searchable custom field handling
 * - FTS sync when is_searchable flag changes
 * - Custom field value updates reflect in FTS
 * - Multiple custom fields per entity
 */

describe('Custom Fields FTS Tests (Phase 3.3)', () => {
  let db: DatabaseType;
  let orgId: string;
  let userId: string;
  let deptId: string;
  let personId: string;

  beforeEach(() => {
    // Create fresh database for each test
    db = new Database(':memory:');
    setupTestDatabase(db, { withFts: true, withTriggers: true });

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

    db.prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)').run(
      orgId,
      'Test Org',
      userId
    );

    db.prepare('INSERT INTO org_members (organization_id, user_id, role) VALUES (?, ?, ?)').run(
      orgId,
      userId,
      'owner'
    );

    db.prepare('INSERT INTO departments (id, organization_id, name) VALUES (?, ?, ?)').run(
      deptId,
      orgId,
      'Engineering'
    );

    db.prepare(
      'INSERT INTO people (id, organization_id, department_id, name, title) VALUES (?, ?, ?, ?, ?)'
    ).run(personId, orgId, deptId, 'John Doe', 'Engineer');
  });

  describe('Searchable vs Non-Searchable Fields', () => {
    it('should index searchable custom field values', () => {
      // Create searchable field definition
      const fieldId = 'field1';
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(fieldId, orgId, 'person', 'location', 'Location', 'text', 1);

      // Add field value
      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', fieldId, personId, 'person', 'San Francisco');

      // Manually sync to FTS (simulating what the service would do)
      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, 'San Francisco');

      // Verify FTS entry
      const ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ? AND entity_type = ?')
        .get(personId, 'person') as { field_values: string } | undefined;

      expect(ftsResult).toBeDefined();
      expect(ftsResult?.field_values).toBe('San Francisco');
    });

    it('should NOT index non-searchable custom field values', () => {
      // Create NON-searchable field definition
      const fieldId = 'field1';
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(fieldId, orgId, 'person', 'internal_notes', 'Internal Notes', 'text', 0);

      // Add field value
      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', fieldId, personId, 'person', 'Secret notes');

      // Verify FTS should NOT have this entry (since is_searchable=0)
      const ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId);

      expect(ftsResult).toBeUndefined();
    });
  });

  describe('Multiple Custom Fields', () => {
    it('should concatenate multiple searchable fields for same entity', () => {
      // Create two searchable fields
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field1', orgId, 'person', 'location', 'Location', 'text', 1);

      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field2', orgId, 'person', 'skills', 'Skills', 'text', 1);

      // Add values
      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', 'field1', personId, 'person', 'San Francisco');

      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val2', 'field2', personId, 'person', 'React TypeScript');

      // Manually build FTS entry (simulating service layer GROUP_CONCAT)
      const values = db
        .prepare(
          `
        SELECT GROUP_CONCAT(v.value, ' ') as concatenated
        FROM custom_field_values v
        JOIN custom_field_definitions d ON v.field_definition_id = d.id
        WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
      `
        )
        .get(personId, 'person') as { concatenated: string };

      // Insert to FTS
      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, values.concatenated);

      // Verify FTS entry contains both values
      const ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId) as { field_values: string };

      expect(ftsResult.field_values).toContain('San Francisco');
      expect(ftsResult.field_values).toContain('React TypeScript');
    });

    it('should only index searchable fields when mixing searchable and non-searchable', () => {
      // Create one searchable and one non-searchable field
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field1', orgId, 'person', 'location', 'Location', 'text', 1); // searchable

      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field2', orgId, 'person', 'internal', 'Internal', 'text', 0); // NOT searchable

      // Add values for both
      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', 'field1', personId, 'person', 'San Francisco');

      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val2', 'field2', personId, 'person', 'Secret data');

      // Build FTS entry with only searchable fields
      const values = db
        .prepare(
          `
        SELECT GROUP_CONCAT(v.value, ' ') as concatenated
        FROM custom_field_values v
        JOIN custom_field_definitions d ON v.field_definition_id = d.id
        WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
      `
        )
        .get(personId, 'person') as { concatenated: string };

      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, values.concatenated);

      const ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId) as { field_values: string };

      // Should contain searchable value
      expect(ftsResult.field_values).toContain('San Francisco');
      // Should NOT contain non-searchable value
      expect(ftsResult.field_values).not.toContain('Secret data');
    });
  });

  describe('FTS Updates on Value Changes', () => {
    beforeEach(() => {
      // Create searchable field
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field1', orgId, 'person', 'location', 'Location', 'text', 1);
    });

    it('should update FTS when custom field value changes', () => {
      // Add initial value
      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', 'field1', personId, 'person', 'San Francisco');

      // Initial FTS sync
      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, 'San Francisco');

      // Update value
      db.prepare('UPDATE custom_field_values SET value = ? WHERE id = ?').run('New York', 'val1');

      // Re-sync FTS (simulating service layer)
      db.prepare('DELETE FROM custom_fields_fts WHERE entity_id = ? AND entity_type = ?').run(
        personId,
        'person'
      );

      const newValues = db
        .prepare(
          `
        SELECT GROUP_CONCAT(v.value, ' ') as concatenated
        FROM custom_field_values v
        JOIN custom_field_definitions d ON v.field_definition_id = d.id
        WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
      `
        )
        .get(personId, 'person') as { concatenated: string };

      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, newValues.concatenated);

      // Verify FTS updated
      const ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId) as { field_values: string };

      expect(ftsResult.field_values).toBe('New York');
      expect(ftsResult.field_values).not.toContain('San Francisco');
    });

    it('should remove FTS entry when all custom fields are deleted', () => {
      // Add value and sync
      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', 'field1', personId, 'person', 'San Francisco');

      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, 'San Francisco');

      // Delete custom field value
      db.prepare('DELETE FROM custom_field_values WHERE id = ?').run('val1');

      // Re-sync FTS (should remove entry since no values left)
      db.prepare('DELETE FROM custom_fields_fts WHERE entity_id = ? AND entity_type = ?').run(
        personId,
        'person'
      );

      const hasValues = db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM custom_field_values v
        JOIN custom_field_definitions d ON v.field_definition_id = d.id
        WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
      `
        )
        .get(personId, 'person') as { count: number };

      if (hasValues.count > 0) {
        const values = db
          .prepare(
            `
          SELECT GROUP_CONCAT(v.value, ' ') as concatenated
          FROM custom_field_values v
          JOIN custom_field_definitions d ON v.field_definition_id = d.id
          WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
        `
          )
          .get(personId, 'person') as { concatenated: string };

        db.prepare(
          'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
        ).run('person', personId, values.concatenated);
      }

      // Verify FTS entry removed
      const ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId);

      expect(ftsResult).toBeUndefined();
    });
  });

  describe('is_searchable Flag Changes', () => {
    it('should rebuild FTS when is_searchable changes from 0 to 1', () => {
      // Create non-searchable field with value
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field1', orgId, 'person', 'location', 'Location', 'text', 0); // NOT searchable initially

      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', 'field1', personId, 'person', 'San Francisco');

      // No FTS entry should exist yet
      let ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId);
      expect(ftsResult).toBeUndefined();

      // Change field to searchable
      db.prepare('UPDATE custom_field_definitions SET is_searchable = 1 WHERE id = ?').run(
        'field1'
      );

      // Rebuild FTS for this entity (simulating service layer)
      const values = db
        .prepare(
          `
        SELECT GROUP_CONCAT(v.value, ' ') as concatenated
        FROM custom_field_values v
        JOIN custom_field_definitions d ON v.field_definition_id = d.id
        WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
      `
        )
        .get(personId, 'person') as { concatenated: string | null };

      if (values.concatenated) {
        db.prepare(
          'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
        ).run('person', personId, values.concatenated);
      }

      // Now FTS should have the value
      ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId) as { field_values: string } | undefined;

      expect(ftsResult).toBeDefined();
      expect(ftsResult?.field_values).toBe('San Francisco');
    });

    it('should rebuild FTS when is_searchable changes from 1 to 0', () => {
      // Create searchable field with value
      db.prepare(
        'INSERT INTO custom_field_definitions (id, organization_id, entity_type, field_key, field_label, field_type, is_searchable) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('field1', orgId, 'person', 'location', 'Location', 'text', 1); // Searchable

      db.prepare(
        'INSERT INTO custom_field_values (id, field_definition_id, entity_id, entity_type, value) VALUES (?, ?, ?, ?, ?)'
      ).run('val1', 'field1', personId, 'person', 'San Francisco');

      // Initial FTS sync
      db.prepare(
        'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
      ).run('person', personId, 'San Francisco');

      let ftsResult = db
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(personId);
      expect(ftsResult).toBeDefined();

      // Change field to non-searchable
      db.prepare('UPDATE custom_field_definitions SET is_searchable = 0 WHERE id = ?').run(
        'field1'
      );

      // Rebuild FTS for this entity
      db.prepare('DELETE FROM custom_fields_fts WHERE entity_id = ? AND entity_type = ?').run(
        personId,
        'person'
      );

      const values = db
        .prepare(
          `
        SELECT GROUP_CONCAT(v.value, ' ') as concatenated
        FROM custom_field_values v
        JOIN custom_field_definitions d ON v.field_definition_id = d.id
        WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1
      `
        )
        .get(personId, 'person') as { concatenated: string | null };

      if (values.concatenated) {
        db.prepare(
          'INSERT INTO custom_fields_fts (entity_type, entity_id, field_values) VALUES (?, ?, ?)'
        ).run('person', personId, values.concatenated);
      }

      // FTS should no longer have the value
      ftsResult = db.prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?').get(personId);

      expect(ftsResult).toBeUndefined();
    });
  });
});
