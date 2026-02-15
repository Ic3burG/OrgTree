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

import type { Database as DatabaseType } from 'better-sqlite3';

/**
 * Creates a complete test database schema that mirrors production.
 * This ensures tests use the same structure as production, preventing schema drift.
 *
 * @param db - better-sqlite3 Database instance (usually in-memory)
 */
export function createTestSchema(db: DatabaseType): void {
  // Enable foreign keys (same as production)
  db.pragma('foreign_keys = ON');

  // Create all tables with EXACT same schema as production
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      backup_codes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Organizations table
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      is_public BOOLEAN DEFAULT 0,
      share_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    );

    -- Organization members (many-to-many)
    CREATE TABLE IF NOT EXISTS org_members (
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'editor', 'viewer')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (organization_id, user_id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Departments table
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES departments(id)
    );

    -- People table
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      organization_id TEXT NOT NULL,
      is_starred INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Custom field definitions
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('department', 'person')),
      field_key TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'date', 'url', 'email', 'phone')),
      is_required INTEGER DEFAULT 0,
      is_searchable INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(organization_id, entity_type, field_key)
    );

    -- Custom field values
    CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      field_definition_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('department', 'person')),
      value TEXT,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE
    );

    -- Invitations table
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      invited_by_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      accepted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      entity_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Refresh tokens table
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Passkeys table
    CREATE TABLE IF NOT EXISTS passkeys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_name TEXT,
      name TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Creates FTS5 virtual tables with triggers that mirror production.
 * Separated from main schema because FTS tables are often rebuilt during tests.
 *
 * @param db - better-sqlite3 Database instance
 */
export function createFtsSchema(db: DatabaseType): void {
  db.exec(`
    -- Departments FTS5 table
    CREATE VIRTUAL TABLE IF NOT EXISTS departments_fts USING fts5(
      name,
      description,
      content='departments',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );

    -- People FTS5 table
    CREATE VIRTUAL TABLE IF NOT EXISTS people_fts USING fts5(
      name,
      title,
      email,
      phone,
      content='people',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );

    -- Custom fields FTS5 table (content='' because it's manually maintained)
    CREATE VIRTUAL TABLE IF NOT EXISTS custom_fields_fts USING fts5(
      entity_type,
      entity_id UNINDEXED,
      field_values,
      content='',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);
}

/**
 * Creates FTS triggers with soft-delete handling (matches production after Phase 1 fixes).
 *
 * @param db - better-sqlite3 Database instance
 */
export function createFtsTriggers(db: DatabaseType): void {
  db.exec(`
    -- ========================================
    -- Departments FTS Triggers
    -- ========================================

    -- INSERT: Add to FTS only if not soft-deleted
    DROP TRIGGER IF EXISTS departments_fts_insert;
    CREATE TRIGGER departments_fts_insert AFTER INSERT ON departments
    WHEN NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO departments_fts(rowid, name, description)
      VALUES (NEW.rowid, NEW.name, NEW.description);
    END;

    -- DELETE: Remove from FTS
    DROP TRIGGER IF EXISTS departments_fts_delete;
    CREATE TRIGGER departments_fts_delete AFTER DELETE ON departments BEGIN
      INSERT INTO departments_fts(departments_fts, rowid, name, description)
      VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
    END;

    -- UPDATE: Split into multiple triggers to avoid corruption
    DROP TRIGGER IF EXISTS departments_fts_update;
    DROP TRIGGER IF EXISTS departments_fts_update_delete;
    DROP TRIGGER IF EXISTS departments_fts_update_undelete;
    DROP TRIGGER IF EXISTS departments_fts_update_normal;

    -- Trigger for soft-deleting (NULL -> NOT NULL)
    CREATE TRIGGER departments_fts_update_delete AFTER UPDATE ON departments
    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
    BEGIN
      INSERT INTO departments_fts(departments_fts, rowid, name, description)
      VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
    END;

    -- Trigger for un-deleting (NOT NULL -> NULL)
    CREATE TRIGGER departments_fts_update_undelete AFTER UPDATE ON departments
    WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO departments_fts(rowid, name, description)
      VALUES (NEW.rowid, NEW.name, NEW.description);
    END;

    -- Trigger for normal updates (NULL -> NULL)
    CREATE TRIGGER departments_fts_update_normal AFTER UPDATE ON departments
    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO departments_fts(departments_fts, rowid, name, description)
      VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
      INSERT INTO departments_fts(rowid, name, description)
      VALUES (NEW.rowid, NEW.name, NEW.description);
    END;

    -- ========================================
    -- People FTS Triggers
    -- ========================================

    -- INSERT: Add to FTS only if not soft-deleted
    DROP TRIGGER IF EXISTS people_fts_insert;
    CREATE TRIGGER people_fts_insert AFTER INSERT ON people
    WHEN NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO people_fts(rowid, name, title, email, phone)
      VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
    END;

    -- DELETE: Remove from FTS
    DROP TRIGGER IF EXISTS people_fts_delete;
    CREATE TRIGGER people_fts_delete AFTER DELETE ON people BEGIN
      INSERT INTO people_fts(people_fts, rowid, name, title, email, phone)
      VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
    END;

    -- UPDATE: Split into multiple triggers to avoid corruption
    DROP TRIGGER IF EXISTS people_fts_update;
    DROP TRIGGER IF EXISTS people_fts_update_delete;
    DROP TRIGGER IF EXISTS people_fts_update_undelete;
    DROP TRIGGER IF EXISTS people_fts_update_normal;

    -- Trigger for soft-deleting (NULL -> NOT NULL)
    CREATE TRIGGER people_fts_update_delete AFTER UPDATE ON people
    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
    BEGIN
      INSERT INTO people_fts(people_fts, rowid, name, title, email, phone)
      VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
    END;

    -- Trigger for un-deleting (NOT NULL -> NULL)
    CREATE TRIGGER people_fts_update_undelete AFTER UPDATE ON people
    WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO people_fts(rowid, name, title, email, phone)
      VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
    END;

    -- Trigger for normal updates (NULL -> NULL)
    CREATE TRIGGER people_fts_update_normal AFTER UPDATE ON people
    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO people_fts(people_fts, rowid, name, title, email, phone)
      VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
      INSERT INTO people_fts(rowid, name, title, email, phone)
      VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
    END;
  `);
}

/**
 * Creates indexes that match production for performance testing.
 *
 * @param db - better-sqlite3 Database instance
 */
export function createTestIndexes(db: DatabaseType): void {
  db.exec(`
    -- Department indexes
    CREATE INDEX IF NOT EXISTS idx_departments_org_id ON departments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);

    -- People indexes
    CREATE INDEX IF NOT EXISTS idx_people_dept_id ON people(department_id);
    CREATE INDEX IF NOT EXISTS idx_people_org_id ON people(organization_id);

    -- Audit log indexes
    CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

    -- Custom field indexes
    CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_custom_field_values_definition ON custom_field_values(field_definition_id);
  `);
}

/**
 * All-in-one function to create complete production-like test database.
 * Use this in most test files unless you need fine-grained control.
 *
 * @param db - better-sqlite3 Database instance
 * @param options - Optional configuration
 */
export function setupTestDatabase(
  db: DatabaseType,
  options: {
    withFts?: boolean;
    withTriggers?: boolean;
    withIndexes?: boolean;
  } = {}
): void {
  const { withFts = true, withTriggers = true, withIndexes = false } = options;

  createTestSchema(db);

  if (withFts) {
    createFtsSchema(db);
  }

  if (withTriggers && withFts) {
    createFtsTriggers(db);
  }

  if (withIndexes) {
    createTestIndexes(db);
  }
}
