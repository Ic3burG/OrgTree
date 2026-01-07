import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

interface TableInfoRow {
  name: string;
  type: string;
}

interface TableNameRow {
  name: string;
}

interface IndexNameRow {
  name: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
// Use DATABASE_URL environment variable or fallback to development database
let dbPath;
if (process.env.DATABASE_URL) {
  // Remove 'file:' prefix if present
  dbPath = process.env.DATABASE_URL.replace(/^file:/, '');
} else {
  // Development fallback
  dbPath = join(__dirname, '..', 'database.db');
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    sort_order INTEGER DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
  );
`);

// Migration: Add sharing columns to organizations table if they don't exist
try {
  const tableInfo = db.prepare('PRAGMA table_info(organizations)').all() as TableInfoRow[];
  const columnNames = tableInfo.map(col => col.name);

  if (!columnNames.includes('is_public')) {
    db.exec('ALTER TABLE organizations ADD COLUMN is_public BOOLEAN DEFAULT 0');
    console.log('Migration: Added is_public column to organizations table');
  }

  if (!columnNames.includes('share_token')) {
    // SQLite doesn't allow adding UNIQUE columns via ALTER TABLE
    db.exec('ALTER TABLE organizations ADD COLUMN share_token TEXT');
    // Create unique index separately
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_share_token ON organizations(share_token)'
    );
    console.log('Migration: Added share_token column to organizations table');
  }
} catch (err) {
  console.error('Migration error:', err);
}

// Migration: Remove office column from people table if it exists
try {
  const peopleTableInfo = db.prepare('PRAGMA table_info(people)').all() as TableInfoRow[];
  const peopleColumnNames = peopleTableInfo.map(col => col.name);

  if (peopleColumnNames.includes('office')) {
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    db.exec(`
      BEGIN TRANSACTION;
      
      -- Create new table without office column
      CREATE TABLE people_new (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT,
        email TEXT,
        phone TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      );
      
      -- Copy data from old table to new table
      INSERT INTO people_new (id, department_id, name, title, email, phone, sort_order, created_at, updated_at)
      SELECT id, department_id, name, title, email, phone, sort_order, created_at, updated_at
      FROM people;
      
      -- Drop old table
      DROP TABLE people;
      
      -- Rename new table to original name
      ALTER TABLE people_new RENAME TO people;
      
      COMMIT;
    `);
    console.log('Migration: Removed office column from people table');
  }
} catch (err) {
  console.error('Migration error (office column removal):', err);
}

// Migration: Add must_change_password column to users table
try {
  const usersTableInfo = db.prepare('PRAGMA table_info(users)').all() as TableInfoRow[];
  const usersColumnNames = usersTableInfo.map(col => col.name);

  if (!usersColumnNames.includes('must_change_password')) {
    db.exec('ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0');
    console.log('Migration: Added must_change_password column to users table');
  }
} catch (err) {
  console.error('Migration error (must_change_password column):', err);
}

// Migration: Add organization_members table
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableNameRow[];
  const tableNames = tables.map(t => t.name);

  if (!tableNames.includes('organization_members')) {
    db.exec(`
      CREATE TABLE organization_members (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        added_by_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (added_by_id) REFERENCES users(id),
        UNIQUE(organization_id, user_id)
      );

      CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
      CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
    `);
    console.log('Migration: Created organization_members table');
  }
} catch (err) {
  console.error('Migration error (organization_members table):', err);
}

// Migration: Add invitations table
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableNameRow[];
  const tableNames = tables.map(t => t.name);

  if (!tableNames.includes('invitations')) {
    db.exec(`
      CREATE TABLE invitations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        token TEXT UNIQUE NOT NULL,
        invited_by_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by_id) REFERENCES users(id)
      );

      CREATE INDEX idx_invitations_org_id ON invitations(organization_id);
      CREATE INDEX idx_invitations_token ON invitations(token);
      CREATE INDEX idx_invitations_email ON invitations(email);
    `);
    console.log('Migration: Created invitations table');
  }
} catch (err) {
  console.error('Migration error (invitations table):', err);
}

// Migration: Add audit_logs table
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableNameRow[];
  const tableNames = tables.map(t => t.name);

  if (!tableNames.includes('audit_logs')) {
    db.exec(`
      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
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

      CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
      CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    `);
    console.log('Migration: Created audit_logs table');
  }
} catch (err) {
  console.error('Migration error (audit_logs table):', err);
}

// Migration: Add FTS5 full-text search tables for advanced search
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableNameRow[];
  const tableNames = tables.map(t => t.name);

  if (!tableNames.includes('departments_fts')) {
    // Create FTS5 virtual table for departments
    db.exec(`
      CREATE VIRTUAL TABLE departments_fts USING fts5(
        name,
        description,
        content='departments',
        content_rowid='rowid',
        tokenize='porter unicode61 remove_diacritics 2'
      );

      -- Triggers to keep FTS in sync with departments table
      CREATE TRIGGER departments_fts_insert AFTER INSERT ON departments BEGIN
        INSERT INTO departments_fts(rowid, name, description)
        VALUES (NEW.rowid, NEW.name, NEW.description);
      END;

      CREATE TRIGGER departments_fts_delete AFTER DELETE ON departments BEGIN
        INSERT INTO departments_fts(departments_fts, rowid, name, description)
        VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
      END;

      CREATE TRIGGER departments_fts_update AFTER UPDATE ON departments BEGIN
        INSERT INTO departments_fts(departments_fts, rowid, name, description)
        VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
        INSERT INTO departments_fts(rowid, name, description)
        VALUES (NEW.rowid, NEW.name, NEW.description);
      END;
    `);

    // Populate FTS table with existing data
    db.exec(`
      INSERT INTO departments_fts(rowid, name, description)
      SELECT rowid, name, description FROM departments;
    `);

    console.log('Migration: Created departments_fts table with triggers');
  }

  if (!tableNames.includes('people_fts')) {
    // Create FTS5 virtual table for people
    db.exec(`
      CREATE VIRTUAL TABLE people_fts USING fts5(
        name,
        title,
        email,
        phone,
        content='people',
        content_rowid='rowid',
        tokenize='porter unicode61 remove_diacritics 2'
      );

      -- Triggers to keep FTS in sync with people table
      CREATE TRIGGER people_fts_insert AFTER INSERT ON people BEGIN
        INSERT INTO people_fts(rowid, name, title, email, phone)
        VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
      END;

      CREATE TRIGGER people_fts_delete AFTER DELETE ON people BEGIN
        INSERT INTO people_fts(people_fts, rowid, name, title, email, phone)
        VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
      END;

      CREATE TRIGGER people_fts_update AFTER UPDATE ON people BEGIN
        INSERT INTO people_fts(people_fts, rowid, name, title, email, phone)
        VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
        INSERT INTO people_fts(rowid, name, title, email, phone)
        VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
      END;
    `);

    // Populate FTS table with existing data
    db.exec(`
      INSERT INTO people_fts(rowid, name, title, email, phone)
      SELECT rowid, name, title, email, phone FROM people;
    `);

    console.log('Migration: Created people_fts table with triggers');
  }

  // Add search optimization indexes if they don't exist
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_departments_org_id ON departments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_people_dept_id ON people(department_id);
  `);
} catch (err) {
  console.error('Migration error (FTS5 tables):', err);
}

// Migration: Add refresh_tokens table for secure token management
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableNameRow[];
  const tableNames = tables.map(t => t.name);

  if (!tableNames.includes('refresh_tokens')) {
    db.exec(`
      CREATE TABLE refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        device_info TEXT,
        ip_address TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Index for fast lookup by user_id (for "revoke all" operations)
      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

      -- Index for token lookup (primary operation)
      CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

      -- Index for cleanup of expired tokens
      CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `);
    console.log('Migration: Created refresh_tokens table');
  }
} catch (err) {
  console.error('Migration error (refresh_tokens table):', err);
}

// Migration: Add deleted_at column for soft deletes
try {
  const departmentsTableInfo = db.prepare('PRAGMA table_info(departments)').all() as TableInfoRow[];
  const departmentsColumnNames = departmentsTableInfo.map(col => col.name);
  if (!departmentsColumnNames.includes('deleted_at')) {
    db.exec('ALTER TABLE departments ADD COLUMN deleted_at DATETIME');
    console.log('Migration: Added deleted_at column to departments table');
  }

  const peopleTableInfo = db.prepare('PRAGMA table_info(people)').all() as TableInfoRow[];
  const peopleColumnNames = peopleTableInfo.map(col => col.name);
  if (!peopleColumnNames.includes('deleted_at')) {
    db.exec('ALTER TABLE people ADD COLUMN deleted_at DATETIME');
    console.log('Migration: Added deleted_at column to people table');
  }
} catch (err) {
  console.error('Migration error (soft delete columns):', err);
}

// Migration: Add performance optimization indexes
try {
  // Check which indexes already exist
  const existingIndexes = (
    db
      .prepare(
        `
    SELECT name FROM sqlite_master WHERE type='index'
  `
      )
      .all() as IndexNameRow[]
  ).map(idx => idx.name);

  const indexesToCreate = [
    // CRITICAL: departments.parent_id - used for hierarchical queries (currently causes table scans)
    {
      name: 'idx_departments_parent_id',
      sql: 'CREATE INDEX idx_departments_parent_id ON departments(parent_id) WHERE deleted_at IS NULL',
    },
    // HIGH PRIORITY: Soft delete filters used in almost every query
    {
      name: 'idx_departments_deleted_at',
      sql: 'CREATE INDEX idx_departments_deleted_at ON departments(deleted_at)',
    },
    {
      name: 'idx_people_deleted_at',
      sql: 'CREATE INDEX idx_people_deleted_at ON people(deleted_at)',
    },
    // MEDIUM PRIORITY: Audit log filtering by action type
    {
      name: 'idx_audit_logs_action_type',
      sql: 'CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type, created_at DESC)',
    },
    // MEDIUM PRIORITY: Finding active invitations
    {
      name: 'idx_invitations_status_expires',
      sql: 'CREATE INDEX idx_invitations_status_expires ON invitations(status, expires_at) WHERE organization_id IS NOT NULL',
    },
    // LOW PRIORITY: Organization owner lookups (not as frequent)
    {
      name: 'idx_organizations_created_by',
      sql: 'CREATE INDEX idx_organizations_created_by ON organizations(created_by_id)',
    },
  ];

  let indexesCreated = 0;
  for (const index of indexesToCreate) {
    if (!existingIndexes.includes(index.name)) {
      db.exec(index.sql);
      indexesCreated++;
      console.log(`Migration: Created index ${index.name}`);
    }
  }

  if (indexesCreated > 0) {
    console.log(`Migration: Created ${indexesCreated} performance optimization index(es)`);
  }
} catch (err) {
  console.error('Migration error (performance indexes):', err);
}

console.log('Database initialized at:', dbPath);

export default db;
