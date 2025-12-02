import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const dbPath = join(__dirname, '..', 'database.db');
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
    office TEXT,
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

console.log('Database initialized at:', dbPath);

export default db;
