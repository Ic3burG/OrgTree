import { Database } from 'better-sqlite3';

export async function initializeDatabase(db: Database) {
  // ============================================================================
  // Performance & Concurrency Optimizations
  // ============================================================================

  // Enable Write-Ahead Logging (WAL) mode for concurrent reads during writes
  // This significantly improves performance for web applications with mixed read/write workloads
  db.pragma('journal_mode = WAL');

  // Wait up to 5 seconds before throwing SQLITE_BUSY error
  // Helps prevent "database is locked" errors during concurrent access
  db.pragma('busy_timeout = 5000');

  // NORMAL synchronous mode is safe with WAL and ~10x faster than FULL
  // In WAL mode, NORMAL guarantees durability even in power loss scenarios
  db.pragma('synchronous = NORMAL');

  // 64MB cache (negative value = KB) for reduced disk I/O
  db.pragma('cache_size = -64000');

  // Store temporary tables in memory for faster operations
  db.pragma('temp_store = MEMORY');

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  // Create migrations table for version tracking (Phase 2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
      is_starred INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );
  `);

  // Run migrations (Phase 2 & 3)
  const { runMigrations } = await import('./migrations/index.js');
  const { legacyMigrations } = await import('./migrations/legacy-migrations.js');

  runMigrations(db, legacyMigrations);
}
