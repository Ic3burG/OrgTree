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

import cron from 'node-cron';
import {
  checkFtsIntegrity,
  optimizeFtsIndexes,
  rebuildAllFtsIndexes,
} from './fts-maintenance.service.js';

// ============================================================================
// Types
// ============================================================================

interface MaintenanceLog {
  timestamp: string;
  action: string;
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Maintenance Task
// ============================================================================

/**
 * Run FTS maintenance: integrity check and optimization
 * This function is called by the scheduled tasks
 */
export function runFtsMaintenance(): MaintenanceLog {
  const timestamp = new Date().toISOString();

  try {
    console.log('[FTS Scheduler] Starting scheduled FTS maintenance...');

    // Check integrity first
    const health = checkFtsIntegrity();

    if (!health.healthy) {
      console.warn('[FTS Scheduler] FTS indexes out of sync:', health.issues);

      // Attempt automatic rebuild if desync is detected
      console.log('[FTS Scheduler] Attempting automatic FTS rebuild...');
      const rebuildResult = rebuildAllFtsIndexes();

      return {
        timestamp,
        action: 'rebuild',
        success: rebuildResult.healthy,
        details: {
          reason: 'automatic_rebuild_on_desync',
          issues: health.issues,
          postRebuildHealth: rebuildResult,
        },
      };
    }

    // Optimize if indexes are healthy
    console.log('[FTS Scheduler] FTS indexes healthy, running optimization...');
    optimizeFtsIndexes();

    return {
      timestamp,
      action: 'optimize',
      success: true,
      details: {
        health: health.statistics,
      },
    };
  } catch (err) {
    console.error('[FTS Scheduler] Maintenance failed:', err);
    return {
      timestamp,
      action: 'maintenance',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// Scheduled Tasks
// ============================================================================

/**
 * Schedule FTS maintenance tasks
 * Call this function once during server startup
 */
export function scheduleFtsMaintenance(): void {
  // Run nightly at 2:00 AM
  cron.schedule(
    '0 2 * * *',
    () => {
      console.log('[FTS Scheduler] Running scheduled nightly FTS maintenance (2:00 AM)');
      const result = runFtsMaintenance();

      if (!result.success) {
        console.error('[FTS Scheduler] Nightly maintenance failed:', result.error);
      } else {
        console.log('[FTS Scheduler] Nightly maintenance completed:', result.action);
      }
    },
    {
      timezone: 'America/New_York', // Adjust timezone as needed
    }
  );

  console.log('[FTS Scheduler] Scheduled nightly FTS maintenance at 2:00 AM (America/New_York)');

  // Optional: Run weekly deep optimization on Sundays at 3:00 AM
  cron.schedule(
    '0 3 * * 0',
    () => {
      console.log('[FTS Scheduler] Running weekly FTS deep maintenance (Sunday 3:00 AM)');
      try {
        const health = checkFtsIntegrity();
        console.log('[FTS Scheduler] Pre-optimization health:', health);

        // Always rebuild on weekly maintenance for thorough cleanup
        const result = rebuildAllFtsIndexes();
        console.log('[FTS Scheduler] Weekly rebuild completed. Post-rebuild health:', result);
      } catch (err) {
        console.error('[FTS Scheduler] Weekly maintenance failed:', err);
      }
    },
    {
      timezone: 'America/New_York',
    }
  );

  console.log(
    '[FTS Scheduler] Scheduled weekly FTS deep maintenance on Sundays at 3:00 AM (America/New_York)'
  );
}

/**
 * Stop all scheduled FTS maintenance tasks
 * Useful for graceful shutdowns or testing
 */
export function stopFtsMaintenance(): void {
  // Node-cron automatically manages task lifecycle
  // This function is a placeholder for future enhancements
  console.log('[FTS Scheduler] FTS maintenance scheduler stopped');
}
