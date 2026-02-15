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

import { Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Migration {
  id: string; // YYYYMMDDHHMMSS format
  name: string; // Descriptive name
  up: (db: Database) => void;
  down: (db: Database) => void;
}

/**
 * Dynamically loads migrations from the versions directory.
 */
export async function discoverMigrations(): Promise<Migration[]> {
  const versionsDir = path.join(__dirname, 'versions');
  if (!fs.existsSync(versionsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(versionsDir)
    .filter(
      f =>
        (f.endsWith('.ts') || f.endsWith('.js')) &&
        !f.endsWith('.test.ts') &&
        !f.endsWith('.test.js')
    )
    .sort();

  const discoveredMigrations: Migration[] = [];
  for (const file of files) {
    const migrationPath = path.join(versionsDir, file);
    try {
      // In ESM, we need to use file:// URLs for absolute paths on Windows or some Linux setups
      const module = await import(`file://${migrationPath}`);
      if (module.migration) {
        discoveredMigrations.push(module.migration);
      }
    } catch (err) {
      console.warn(`Skipping migration file ${file} due to load error:`, err);
    }
  }

  return discoveredMigrations.sort((a, b) => a.id.localeCompare(b.id));
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
