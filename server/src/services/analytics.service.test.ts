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

import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import { trackEvent, trackEvents, getAnalyticsSummary } from './analytics.service.js';
import { randomUUID } from 'crypto';

describe('Analytics Service', () => {
  beforeAll(async () => {
    // Ensure table is clean for some tests if needed,
    // but in-memory db for tests usually handles this
  });

  it('should track a single event', () => {
    const event = {
      event_name: 'test_event',
      category: 'testing',
      properties: { key: 'value' },
      session_id: randomUUID(),
    };

    trackEvent(event);

    const row = db
      .prepare('SELECT * FROM analytics_events WHERE event_name = ?')
      .get('test_event') as any;
    expect(row).toBeDefined();
    expect(row.category).toBe('testing');
    expect(JSON.parse(row.properties)).toEqual({ key: 'value' });
  });

  it('should track batch events in a transaction', () => {
    const prefix = randomUUID();
    const events = [
      { event_name: `${prefix}_1`, session_id: 's1', category: 'batch' },
      { event_name: `${prefix}_2`, session_id: 's1', category: 'batch' },
    ];

    trackEvents(events);

    const count = (
      db
        .prepare('SELECT COUNT(*) as count FROM analytics_events WHERE event_name LIKE ?')
        .get(`${prefix}_%`) as any
    ).count;
    expect(count).toBe(2);
  });

  it('should return analytics summary', () => {
    const summary = getAnalyticsSummary(1);
    expect(summary).toHaveProperty('total_events');
    expect(summary).toHaveProperty('unique_sessions');
    expect(summary.total_events).toBeGreaterThan(0);
  });

  it('should handle errors gracefully without throwing', () => {
    // Force an error by passing invalid data (e.g. missing required session_id if it was NOT NULL,
    // but SQLite might not complain if we don't have constraints)
    // Actually, trackEvent catches all errors.

    // @ts-expect-error - Testing error handling with invalid input
    expect(() => trackEvent(null)).not.toThrow();
  });
});
