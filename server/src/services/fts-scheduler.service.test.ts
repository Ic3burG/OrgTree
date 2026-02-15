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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFtsMaintenance, scheduleFtsMaintenance } from './fts-scheduler.service.js';
import * as ftsService from './fts-maintenance.service.js';
import cron from 'node-cron';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
  schedule: vi.fn(),
}));

vi.mock('./fts-maintenance.service.js', () => ({
  checkFtsIntegrity: vi.fn(),
  optimizeFtsIndexes: vi.fn(),
  rebuildAllFtsIndexes: vi.fn(),
}));

describe('FTS Scheduler Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runFtsMaintenance should optimize if healthy', () => {
    (ftsService.checkFtsIntegrity as any).mockReturnValue({ healthy: true, statistics: {} });

    const result = runFtsMaintenance();

    expect(result.action).toBe('optimize');
    expect(result.success).toBe(true);
    expect(ftsService.optimizeFtsIndexes).toHaveBeenCalled();
  });

  it('runFtsMaintenance should rebuild if unhealthy', () => {
    (ftsService.checkFtsIntegrity as any).mockReturnValue({
      healthy: false,
      issues: ['out of sync'],
    });
    (ftsService.rebuildAllFtsIndexes as any).mockReturnValue({ healthy: true });

    const result = runFtsMaintenance();

    expect(result.action).toBe('rebuild');
    expect(result.success).toBe(true);
    expect(ftsService.rebuildAllFtsIndexes).toHaveBeenCalled();
  });

  it('scheduleFtsMaintenance should register cron tasks', () => {
    scheduleFtsMaintenance();
    expect(cron.schedule).toHaveBeenCalled();
  });
});
