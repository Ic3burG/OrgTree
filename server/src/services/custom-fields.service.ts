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

import { randomUUID } from 'crypto';
import db from '../db.js';
import type {
  CustomFieldDefinition,
  DatabaseCustomFieldDefinition,
  CustomFieldType,
  AppError,
} from '../types/index.js';
import { requireOrgPermission } from './member.service.js';

// Helper to convert DB definition to API definition
function toCustomFieldDefinition(dbDef: DatabaseCustomFieldDefinition): CustomFieldDefinition {
  return {
    id: dbDef.id,
    organization_id: dbDef.organization_id,
    entity_type: dbDef.entity_type,
    name: dbDef.name,
    field_key: dbDef.field_key,
    field_type: dbDef.field_type,
    options: dbDef.options ? JSON.parse(dbDef.options) : null,
    is_required: Boolean(dbDef.is_required),
    is_searchable: Boolean(dbDef.is_searchable),
    sort_order: dbDef.sort_order,
    created_at: dbDef.created_at,
    updated_at: dbDef.updated_at,
  };
}

/**
 * Get all custom field definitions for an organization
 */
export async function getFieldDefinitions(
  orgId: string,
  entityType: 'person' | 'department' | 'all',
  userId: string
): Promise<CustomFieldDefinition[]> {
  await requireOrgPermission(orgId, userId, 'viewer');

  let query = `
    SELECT * FROM custom_field_definitions 
    WHERE organization_id = ?
  `;
  const params: string[] = [orgId];

  if (entityType !== 'all') {
    query += ` AND entity_type = ?`;
    params.push(entityType);
  }

  query += ` ORDER BY entity_type, sort_order ASC`;

  const definitions = db.prepare(query).all(...params) as DatabaseCustomFieldDefinition[];
  return definitions.map(toCustomFieldDefinition);
}

/**
 * Create a new custom field definition
 */
export async function createFieldDefinition(
  orgId: string,
  data: {
    entity_type: 'person' | 'department';
    name: string;
    field_type: CustomFieldType;
    options?: string[];
    is_required?: boolean;
    is_searchable?: boolean;
  },
  userId: string
): Promise<CustomFieldDefinition> {
  await requireOrgPermission(orgId, userId, 'admin');

  // Generate field_key from name (slugify)
  const fieldKey = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!fieldKey) {
    const error = new Error('Invalid field name') as AppError;
    error.status = 400;
    throw error;
  }

  // Check if key already exists
  const existing = db
    .prepare(
      `SELECT id FROM custom_field_definitions WHERE organization_id = ? AND entity_type = ? AND field_key = ?`
    )
    .get(orgId, data.entity_type, fieldKey);

  if (existing) {
    const error = new Error(
      `Field with name "${data.name}" (key: ${fieldKey}) already exists`
    ) as AppError;
    error.status = 409;
    throw error;
  }

  // Get next sort order
  const maxSort = db
    .prepare(
      `SELECT MAX(sort_order) as max_sort FROM custom_field_definitions WHERE organization_id = ? AND entity_type = ?`
    )
    .get(orgId, data.entity_type) as { max_sort: number | null };

  const id = randomUUID();
  const sortOrder = (maxSort?.max_sort ?? -1) + 1;

  db.prepare(
    `
    INSERT INTO custom_field_definitions (
      id, organization_id, entity_type, name, field_key, field_type, options, is_required, is_searchable, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    orgId,
    data.entity_type,
    data.name,
    fieldKey,
    data.field_type,
    data.options ? JSON.stringify(data.options) : null,
    data.is_required ? 1 : 0,
    data.is_searchable !== false ? 1 : 0, // Default true
    sortOrder
  );

  const created = db
    .prepare(`SELECT * FROM custom_field_definitions WHERE id = ?`)
    .get(id) as DatabaseCustomFieldDefinition;

  return toCustomFieldDefinition(created);
}

/**
 * Update a custom field definition
 */
export async function updateFieldDefinition(
  fieldId: string,
  data: {
    name?: string;
    options?: string[];
    is_required?: boolean;
    is_searchable?: boolean;
  },
  userId: string
): Promise<CustomFieldDefinition> {
  const current = db
    .prepare(`SELECT * FROM custom_field_definitions WHERE id = ?`)
    .get(fieldId) as DatabaseCustomFieldDefinition;

  if (!current) {
    const error = new Error('Field definition not found') as AppError;
    error.status = 404;
    throw error;
  }

  await requireOrgPermission(current.organization_id, userId, 'admin');

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
    // Note: We deliberately DO NOT update field_key to preserve data integrity and API contracts
  }

  if (data.options !== undefined) {
    updates.push('options = ?');
    params.push(JSON.stringify(data.options));
  }

  if (data.is_required !== undefined) {
    updates.push('is_required = ?');
    params.push(data.is_required ? 1 : 0);
  }

  if (data.is_searchable !== undefined) {
    updates.push('is_searchable = ?');
    params.push(data.is_searchable ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE custom_field_definitions SET ${updates.join(', ')} WHERE id = ?`).run(
      ...params,
      fieldId
    );
  }

  const updated = db
    .prepare(`SELECT * FROM custom_field_definitions WHERE id = ?`)
    .get(fieldId) as DatabaseCustomFieldDefinition;

  return toCustomFieldDefinition(updated);
}

/**
 * Delete a custom field definition
 */
export async function deleteFieldDefinition(fieldId: string, userId: string): Promise<void> {
  const current = db
    .prepare(`SELECT * FROM custom_field_definitions WHERE id = ?`)
    .get(fieldId) as DatabaseCustomFieldDefinition;

  if (!current) {
    const error = new Error('Field definition not found') as AppError;
    error.status = 404;
    throw error;
  }

  await requireOrgPermission(current.organization_id, userId, 'admin');

  // Deleting definition will cascade delete values due to foreign key constraints
  db.prepare(`DELETE FROM custom_field_definitions WHERE id = ?`).run(fieldId);
}

/**
 * Reorder custom field definitions
 */
export async function reorderFieldDefinitions(
  orgId: string,
  _entityType: string,
  orderedIds: string[],
  userId: string
): Promise<void> {
  await requireOrgPermission(orgId, userId, 'admin');

  const updateStmt = db.prepare(
    `UPDATE custom_field_definitions SET sort_order = ? WHERE id = ? AND organization_id = ?`
  );

  const transaction = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      updateStmt.run(index, id, orgId);
    });
  });

  transaction();
}

/**
 * Get internal consolidated custom fields for an entity
 * Returns Record<field_key, value>
 */
export function getCustomHeaderFields(
  entityType: 'person' | 'department',
  entityId: string
): Record<string, unknown> {
  const rows = db
    .prepare(
      `
    SELECT d.field_key, v.value 
    FROM custom_field_values v
    JOIN custom_field_definitions d ON v.field_definition_id = d.id
    WHERE v.entity_type = ? AND v.entity_id = ?
  `
    )
    .all(entityType, entityId) as { field_key: string; value: string }[];

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    // Attempt to parse JSON values for select/multiselect if needed,
    // but for now we treat everything as string or let the frontend parse it.
    // Spec says values are stored as TEXT. Multiselect is JSON array string.
    result[row.field_key] = row.value;
  }
  return result;
}

/**
 * Set custom field values for an entity
 */
export async function setEntityCustomFields(
  orgId: string,
  entityType: 'person' | 'department',
  entityId: string,
  customFields: Record<string, unknown>
): Promise<void> {
  // Get all definitions for this org to map keys to IDs
  const definitions = db
    .prepare(
      `SELECT id, field_key, field_type, options, is_required FROM custom_field_definitions WHERE organization_id = ? AND entity_type = ?`
    )
    .all(orgId, entityType) as DatabaseCustomFieldDefinition[];

  const defMap = new Map(definitions.map(d => [d.field_key, d]));

  const insertStmt = db.prepare(`
    INSERT INTO custom_field_values (id, field_definition_id, entity_type, entity_id, value)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(field_definition_id, entity_id) 
    DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM custom_field_values 
    WHERE field_definition_id = ? AND entity_id = ?
  `);

  const transaction = db.transaction(() => {
    // 1. Process provided fields
    for (const [key, value] of Object.entries(customFields)) {
      const def = defMap.get(key);
      if (!def) continue; // Skip unknown fields

      // Handle null/undefined/empty string as removal
      if (value === null || value === undefined || value === '') {
        deleteStmt.run(def.id, entityId);
        continue;
      }

      // Convert value to string for storage
      let stringValue = String(value);
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      }

      validateValue(def, stringValue);

      insertStmt.run(randomUUID(), def.id, entityType, entityId, stringValue);
    }

    // 2. Update FTS index with all searchable values for this entity
    const searchableValues = db
      .prepare(
        `SELECT v.value
         FROM custom_field_values v
         JOIN custom_field_definitions d ON v.field_definition_id = d.id
         WHERE v.entity_id = ? AND v.entity_type = ? AND d.is_searchable = 1`
      )
      .all(entityId, entityType) as { value: string }[];

    const ftsContent = searchableValues
      .map(v => v.value)
      .filter(v => v && v.trim())
      .join(' ');

    if (ftsContent) {
      db.prepare(
        `INSERT OR REPLACE INTO custom_fields_fts (entity_id, entity_type, field_values)
         VALUES (?, ?, ?)`
      ).run(entityId, entityType, ftsContent);
    } else {
      // Remove from FTS if no searchable values remain
      db.prepare(`DELETE FROM custom_fields_fts WHERE entity_id = ? AND entity_type = ?`).run(
        entityId,
        entityType
      );
    }
  });

  transaction();
}

/**
 * Validate a value against its field definition
 */
function validateValue(def: DatabaseCustomFieldDefinition, value: string): void {
  // Basic type validation logic
  switch (def.field_type) {
    case 'number':
      if (isNaN(Number(value))) throw new Error(`Invalid number for field ${def.name}`);
      break;
    case 'select':
      if (def.options) {
        const options = JSON.parse(def.options) as string[];
        if (!options.includes(value)) throw new Error(`Invalid option for field ${def.name}`);
      }
      break;
    case 'multiselect':
      // Value should be JSON array string
      try {
        const selected = JSON.parse(value);
        if (!Array.isArray(selected)) throw new Error('Multiselect value must be an array');
        if (def.options) {
          const options = JSON.parse(def.options) as string[];
          if (!selected.every(s => options.includes(s))) {
            throw new Error(`Invalid options for field ${def.name}`);
          }
        }
      } catch {
        throw new Error(`Invalid multiselect format for field ${def.name}`);
      }
      break;
    case 'date':
      if (isNaN(Date.parse(value))) throw new Error(`Invalid date for field ${def.name}`);
      break;
    case 'url':
      try {
        new URL(value);
      } catch {
        throw new Error(`Invalid URL for field ${def.name}`);
      }
      break;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        throw new Error(`Invalid email for field ${def.name}`);
      break;
  }
}
