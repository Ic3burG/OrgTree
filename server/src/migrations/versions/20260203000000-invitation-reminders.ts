import { Migration } from '../index.js';

export const migration: Migration = {
  id: '20260203000000',
  name: 'Add last_reminder_sent_at to invitations',
  up: db => {
    // Add last_reminder_sent_at column to invitations table
    const tableInfo = db.prepare('PRAGMA table_info(invitations)').all() as { name: string }[];
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('last_reminder_sent_at')) {
      db.exec('ALTER TABLE invitations ADD COLUMN last_reminder_sent_at DATETIME');
    }
  },
  down: () => {
    // SQLite doesn't support DROP COLUMN in older versions, and better-sqlite3
    // migration rollback often skips destructive schema changes for safety or
    // requires table recreation. For this simple addition, we can leave it or
    // implement a full table recreation if strict rollback is needed.
    // Given our existing patterns, we'll leave the column or no-op.
  },
};
