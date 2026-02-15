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

import path from 'path';
import { createBackup } from './backup.service.js';
import logger from '../utils/logger.js';

// Default backup directory (can be overridden via environment variable)
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

/**
 * Create a specialized backup before running database migrations
 * These backups are prefixed with 'pre-migration-' for easy identification
 */
export async function createPreMigrationBackup(): Promise<{
  success: boolean;
  path?: string;
  size?: number;
  sizeMB?: number;
  timestamp?: string;
  error?: string;
}> {
  try {
    const now = new Date();
    // Use a format that is filesystem-safe and easy to read
    const timestamp = now.toISOString().replace(/T/, '-').replace(/:/g, '').replace(/\..+/, '');

    const filename = `pre-migration-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    logger.info('Creating pre-migration database backup', { filename });

    const result = await createBackup(backupPath);

    if (result.success) {
      logger.info('Pre-migration backup created successfully', {
        path: result.path,
        sizeMB: result.sizeMB,
      });
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Pre-migration backup failed', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export default {
  createPreMigrationBackup,
};
