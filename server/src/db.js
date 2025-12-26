import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
  );
`);

// Migration: Add sharing columns to organizations table if they don't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(organizations)").all();
  const columnNames = tableInfo.map(col => col.name);

  if (!columnNames.includes('is_public')) {
    db.exec('ALTER TABLE organizations ADD COLUMN is_public BOOLEAN DEFAULT 0');
    console.log('Migration: Added is_public column to organizations table');
  }

  if (!columnNames.includes('share_token')) {
    // SQLite doesn't allow adding UNIQUE columns via ALTER TABLE
    db.exec('ALTER TABLE organizations ADD COLUMN share_token TEXT');
    // Create unique index separately
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_share_token ON organizations(share_token)');
    console.log('Migration: Added share_token column to organizations table');
  }
} catch (err) {
  console.error('Migration error:', err);
}

// Migration: Remove office column from people table if it exists
try {
  const peopleTableInfo = db.prepare("PRAGMA table_info(people)").all();
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
  const usersTableInfo = db.prepare("PRAGMA table_info(users)").all();
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
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
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
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
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
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
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

console.log('Database initialized at:', dbPath);

export default db;
