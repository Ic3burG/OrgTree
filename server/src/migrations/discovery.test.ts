import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from '../db-init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Migration Discovery (Phase 3)', () => {
  let db: Database.Database;
  const versionsDir = path.join(__dirname, 'versions');

  beforeEach(() => {
    db = new Database(':memory:');
    if (!fs.existsSync(versionsDir)) {
      fs.mkdirSync(versionsDir, { recursive: true });
    }
  });

  afterEach(() => {
    db.close();
    // Clean up dummy migrations
    const files = fs.readdirSync(versionsDir);
    for (const file of files) {
      if (file.startsWith('99999999999999')) {
        fs.unlinkSync(path.join(versionsDir, file));
      }
    }
  });

  it('should discover and run migrations in the versions directory', async () => {
    // Create a dummy migration
    const migrationId = '99999999999999';
    const migrationFile = path.join(versionsDir, `${migrationId}_test.ts`);
    const content = `
export const migration = {
  id: '${migrationId}',
  name: 'Test Migration',
  up: (db) => {
    db.exec('CREATE TABLE test_discovery (id TEXT PRIMARY KEY)');
  },
  down: (db) => {
    db.exec('DROP TABLE test_discovery');
  }
};
`;
    fs.writeFileSync(migrationFile, content);

    await initializeDatabase(db);

    // Verify it ran
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_discovery'")
      .get();
    expect(table).toBeDefined();

    // Verify it was logged
    const logged = db.prepare('SELECT * FROM _migrations WHERE id = ?').get(migrationId);
    expect(logged).toBeDefined();
    expect((logged as any).name).toBe('Test Migration');
  });
});
