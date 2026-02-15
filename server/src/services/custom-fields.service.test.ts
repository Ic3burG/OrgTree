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

// Mock dependencies
vi.mock('../db.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db: DatabaseType = new Database(':memory:');

  // Initialize schema needed for custom fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      name TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options TEXT,
      is_required INTEGER DEFAULT 0,
      is_searchable INTEGER DEFAULT 1,
      sort_order INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(organization_id, entity_type, field_key)
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      field_definition_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      value TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(field_definition_id, entity_id),
      FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_fields_fts (
        entity_id TEXT,
        entity_type TEXT,
        field_values TEXT,
        PRIMARY KEY (entity_id, entity_type)
    );
  `);

  return { default: db };
});

vi.mock('./member.service.js', () => ({
  requireOrgPermission: vi.fn(),
}));

import db from '../db.js';
import { requireOrgPermission } from './member.service.js';
import {
  createFieldDefinition,
  getFieldDefinitions,
  updateFieldDefinition,
  deleteFieldDefinition,
  reorderFieldDefinitions,
  setEntityCustomFields,
  getCustomHeaderFields,
} from './custom-fields.service.js';

describe('Custom Fields Service', () => {
  const orgId = 'org-123';
  const userId = 'user-123';

  beforeEach(() => {
    vi.resetAllMocks();
    (db as DatabaseType).prepare('DELETE FROM custom_field_definitions').run();
    (db as DatabaseType).prepare('DELETE FROM custom_field_values').run();
    (db as DatabaseType).prepare('DELETE FROM custom_fields_fts').run();
  });

  describe('createFieldDefinition', () => {
    it('should create a new field definition', async () => {
      const field = await createFieldDefinition(
        orgId,
        {
          entity_type: 'person',
          name: 'Job Title',
          field_type: 'text',
          is_required: true,
        },
        userId
      );

      expect(field).toHaveProperty('id');
      expect(field.name).toBe('Job Title');
      expect(field.field_key).toBe('job_title');
      expect(field.is_required).toBe(true);
      expect(field.sort_order).toBe(0);
      expect(requireOrgPermission).toHaveBeenCalledWith(orgId, userId, 'admin');
    });

    it('should throw error if field name is invalid', async () => {
      await expect(
        createFieldDefinition(
          orgId,
          {
            entity_type: 'person',
            name: '', // Empty name
            field_type: 'text',
          },
          userId
        )
      ).rejects.toThrow('Invalid field name');
    });

    it('should throw error if duplicate field key exists', async () => {
      await createFieldDefinition(
        orgId,
        {
          entity_type: 'person',
          name: 'Duplicate Name',
          field_type: 'text',
        },
        userId
      );

      await expect(
        createFieldDefinition(
          orgId,
          {
            entity_type: 'person',
            name: 'Duplicate Name',
            field_type: 'number',
          },
          userId
        )
      ).rejects.toThrow('already exists');
    });

    it('should increment sort order for new fields', async () => {
      const field1 = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Field 1', field_type: 'text' },
        userId
      );
      const field2 = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Field 2', field_type: 'text' },
        userId
      );

      expect(field1.sort_order).toBe(0);
      expect(field2.sort_order).toBe(1);
    });
  });

  describe('getFieldDefinitions', () => {
    it('should return fields for specific entity type', async () => {
      await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Person Field', field_type: 'text' },
        userId
      );
      await createFieldDefinition(
        orgId,
        { entity_type: 'department', name: 'Dept Field', field_type: 'text' },
        userId
      );

      const personFields = await getFieldDefinitions(orgId, 'person', userId);
      expect(personFields).toHaveLength(1);
      expect(personFields[0].name).toBe('Person Field');

      const deptFields = await getFieldDefinitions(orgId, 'department', userId);
      expect(deptFields).toHaveLength(1);
      expect(deptFields[0].name).toBe('Dept Field');
    });

    it('should return all fields when entityType is all', async () => {
      await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Person Field', field_type: 'text' },
        userId
      );
      await createFieldDefinition(
        orgId,
        { entity_type: 'department', name: 'Dept Field', field_type: 'text' },
        userId
      );

      const allFields = await getFieldDefinitions(orgId, 'all', userId);
      expect(allFields).toHaveLength(2);
    });
  });

  describe('updateFieldDefinition', () => {
    it('should update field definition properties', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Old Name', field_type: 'text' },
        userId
      );

      const updated = await updateFieldDefinition(
        field.id,
        {
          name: 'New Name',
          is_required: true,
        },
        userId
      );

      expect(updated.name).toBe('New Name');
      expect(updated.is_required).toBe(true);
      // Field key should NOT change
      expect(updated.field_key).toBe('old_name');
    });
  });

  describe('deleteFieldDefinition', () => {
    it('should delete field definition', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'To Delete', field_type: 'text' },
        userId
      );

      await deleteFieldDefinition(field.id, userId);

      const fields = await getFieldDefinitions(orgId, 'person', userId);
      expect(fields).toHaveLength(0);
    });
  });

  describe('reorderFieldDefinitions', () => {
    it('should update sort order based on provided IDs', async () => {
      const f1 = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'F1', field_type: 'text' },
        userId
      );
      const f2 = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'F2', field_type: 'text' },
        userId
      );
      const f3 = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'F3', field_type: 'text' },
        userId
      );

      // Current order: 0, 1, 2.  Reverse it: 2, 1, 0 IDs
      await reorderFieldDefinitions(orgId, 'person', [f3.id, f2.id, f1.id], userId);

      const fields = await getFieldDefinitions(orgId, 'person', userId);
      // getFieldDefinitions orders by sort_order
      expect(fields[0].id).toBe(f3.id);
      expect(fields[0].sort_order).toBe(0);
      expect(fields[1].id).toBe(f2.id);
      expect(fields[1].sort_order).toBe(1);
      expect(fields[2].id).toBe(f1.id);
      expect(fields[2].sort_order).toBe(2);
    });
  });

  describe('setEntityCustomFields & Validation', () => {
    const entityId = 'person-1';

    it('should save valid text values', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Bio', field_type: 'text' },
        userId
      );

      await setEntityCustomFields(orgId, 'person', entityId, {
        [field.field_key]: 'Hello World',
      });

      const values = getCustomHeaderFields('person', entityId);
      expect(values[field.field_key]).toBe('Hello World');
    });

    it('should remove values set to null/empty', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Bio', field_type: 'text' },
        userId
      );

      await setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: 'Exists' });
      await setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: '' });

      const values = getCustomHeaderFields('person', entityId);
      expect(values[field.field_key]).toBeUndefined();
    });

    it('should throw validation error for invalid number', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Age', field_type: 'number' },
        userId
      );

      await expect(
        setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: 'not a number' })
      ).rejects.toThrow('Invalid number');
    });

    it('should throw validation error for invalid select option', async () => {
      const field = await createFieldDefinition(
        orgId,
        {
          entity_type: 'person',
          name: 'Status',
          field_type: 'select',
          options: ['Active', 'Inactive'],
        },
        userId
      );

      await expect(
        setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: 'Unknown' })
      ).rejects.toThrow('Invalid option');
    });

    it('should parse and save multiselect values correctly', async () => {
      const field = await createFieldDefinition(
        orgId,
        {
          entity_type: 'person',
          name: 'Skills',
          field_type: 'multiselect',
          options: ['JS', 'TS', 'Py'],
        },
        userId
      );

      const skills = ['JS', 'TS'];
      await setEntityCustomFields(orgId, 'person', entityId, {
        [field.field_key]: JSON.stringify(skills),
      });

      const values = getCustomHeaderFields('person', entityId);
      // It is stored as stringified JSON
      expect(values[field.field_key]).toBe(JSON.stringify(skills));
    });

    it('should validate email format', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Contact', field_type: 'email' },
        userId
      );

      await expect(
        setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: 'bad-email' })
      ).rejects.toThrow('Invalid email');

      await expect(
        setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: 'good@example.com' })
      ).resolves.not.toThrow();
    });

    it('should validate url format', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Website', field_type: 'url' },
        userId
      );

      await expect(
        setEntityCustomFields(orgId, 'person', entityId, { [field.field_key]: 'ht tp://broken' })
      ).rejects.toThrow('Invalid URL');
      await expect(
        setEntityCustomFields(orgId, 'person', entityId, {
          [field.field_key]: 'https://example.com',
        })
      ).resolves.not.toThrow();
    });

    it('should update FTS index with searchable fields', async () => {
      const field = await createFieldDefinition(
        orgId,
        { entity_type: 'person', name: 'Search Me', field_type: 'text', is_searchable: true },
        userId
      );

      await setEntityCustomFields(orgId, 'person', entityId, {
        [field.field_key]: 'FindThisValue',
      });

      const fts = (db as DatabaseType)
        .prepare('SELECT * FROM custom_fields_fts WHERE entity_id = ?')
        .get(entityId) as any;
      expect(fts).toBeDefined();
      expect(fts.field_values).toContain('FindThisValue');
    });
  });
});
