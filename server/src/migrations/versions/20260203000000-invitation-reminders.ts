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
