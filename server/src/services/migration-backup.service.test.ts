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

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { createPreMigrationBackup } from './migration-backup.service.js';
import { createBackup } from './backup.service.js';

// Mock backup service
vi.mock('./backup.service.js', () => ({
  createBackup: vi.fn(),
  ensureBackupDir: vi.fn(),
  listBackups: vi.fn(),
  cleanupOldBackups: vi.fn(),
  getBackupStats: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Migration Backup Service', () => {
  const mockDate = new Date('2026-01-01T12:00:00Z');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a pre-migration backup with correct name', async () => {
    const mockResult = {
      success: true,
      path: '/mock/backups/pre-migration-2026-01-01-120000.db',
      sizeMB: 5,
      timestamp: mockDate.toISOString(),
    };
    (createBackup as Mock).mockResolvedValue(mockResult);

    const result = await createPreMigrationBackup();

    expect(createBackup).toHaveBeenCalledWith(
      expect.stringContaining('pre-migration-2026-01-01-120000.db')
    );
    expect(result).toEqual(mockResult);
  });

  it('should handle backup failure correctly', async () => {
    const mockError = {
      success: false,
      error: 'Disk full',
    };
    (createBackup as Mock).mockResolvedValue(mockError);

    const result = await createPreMigrationBackup();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Disk full');
  });

  it('should catch unexpected errors', async () => {
    (createBackup as Mock).mockRejectedValue(new Error('Unexpected error'));

    const result = await createPreMigrationBackup();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error');
  });
});
