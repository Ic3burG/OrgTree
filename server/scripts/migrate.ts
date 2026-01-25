import Database from 'better-sqlite3';
import { runMigrations, discoverMigrations } from '../src/migrations/index.js';
import { legacyMigrations } from '../src/migrations/legacy-migrations.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'orgtree.db');
const db = new Database(dbPath);

async function main() {
  const command = process.argv[2];
  const targetId = process.argv[3];

  if (command === 'status') {
    const applied = db
      .prepare('SELECT id, name, applied_at FROM _migrations ORDER BY id ASC')
      .all();
    console.log('Applied migrations:');
    console.table(applied);
    return;
  }

  if (command === 'up') {
    console.log('Running UP migrations...');
    runMigrations(db, legacyMigrations);
    const discovered = await discoverMigrations();
    runMigrations(db, discovered);
    console.log('Done.');
    return;
  }

  if (command === 'down') {
    if (!targetId) {
      console.error('Usage: npm run migrate down <migration_id>');
      process.exit(1);
    }

    const migration = [...legacyMigrations, ...(await discoverMigrations())].find(
      m => m.id === targetId
    );
    if (!migration) {
      console.error(`Migration ${targetId} not found.`);
      process.exit(1);
    }

    console.log(`Rolling back migration: ${migration.id} - ${migration.name}`);
    try {
      db.transaction(() => {
        migration.down(db);
        db.prepare('DELETE FROM _migrations WHERE id = ?').run(migration.id);
      })();
      console.log('Successfully rolled back.');
    } catch (error) {
      console.error('Failed to rollback:', error);
      process.exit(1);
    }
    return;
  }

  console.log('Usage: npm run migrate <status|up|down>');
}

main().catch(console.error);
