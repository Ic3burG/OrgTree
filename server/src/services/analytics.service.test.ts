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
