import { Database } from 'better-sqlite3';

export interface Migration {
  id: string; // YYYYMMDDHHMMSS format
  name: string; // Descriptive name
  up: (db: Database) => void;
  down: (db: Database) => void;
}

/**
 * Ensures the migrations table exists and tracks applied migrations.
 */
export function runMigrations(db: Database, migrations: Migration[]) {
  // Ensure tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const migration of migrations) {
    const applied = db.prepare('SELECT id FROM _migrations WHERE id = ?').get(migration.id);
    if (applied) continue;

    console.log(`Applying migration: ${migration.id} - ${migration.name}`);

    try {
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(
          migration.id,
          migration.name
        );
      })();
      console.log(`Successfully applied migration: ${migration.id}`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration.id}:`, error);
      throw error;
    }
  }
}
