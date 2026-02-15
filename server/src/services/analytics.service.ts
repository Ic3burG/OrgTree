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

import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import logger from '../utils/logger.js';
import { AnalyticsEvent, AnalyticsSummary } from '../types/analytics.js';

/**
 * Track a single analytics event
 */
export function trackEvent(event: AnalyticsEvent): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO analytics_events (
        id, event_name, category, properties, session_id, user_id, url, device_type
      ) VALUES (
        @id, @event_name, @category, @properties, @session_id, @user_id, @url, @device_type
      )
    `);

    stmt.run({
      id: uuidv4(),
      event_name: event.event_name,
      category: event.category,
      properties: JSON.stringify(event.properties || {}),
      session_id: event.session_id,
      user_id: event.user_id || null,
      url: event.url || null,
      device_type: event.device_type || null,
    });
  } catch (error) {
    // Log error but don't crash the request - analytics failure shouldn't block user action
    logger.error('Failed to track analytics event', { error, event });
  }
}

/**
 * Track multiple analytics events (batch)
 */
export function trackEvents(events: AnalyticsEvent[]): void {
  if (!events.length) return;

  try {
    const insert = db.prepare(`
      INSERT INTO analytics_events (
        id, event_name, category, properties, session_id, user_id, url, device_type
      ) VALUES (
        @id, @event_name, @category, @properties, @session_id, @user_id, @url, @device_type
      )
    `);

    const trackTransaction = db.transaction((events: AnalyticsEvent[]) => {
      for (const event of events) {
        insert.run({
          id: uuidv4(),
          event_name: event.event_name,
          category: event.category,
          properties: JSON.stringify(event.properties || {}),
          session_id: event.session_id,
          user_id: event.user_id || null,
          url: event.url || null,
          device_type: event.device_type || null,
        });
      }
    });

    trackTransaction(events);
  } catch (error) {
    logger.error('Failed to batch track analytics events', { error, count: events.length });
  }
}

/**
 * Get analytics summary for dashboard
 * (Restricted to superusers usually)
 */
export function getAnalyticsSummary(days = 30): AnalyticsSummary {
  try {
    // Total events in period
    const totalEvents = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM analytics_events 
      WHERE created_at >= date('now', '-${days} days')
    `
      )
      .get() as { count: number };

    // Unique sessions in period
    const uniqueSessions = db
      .prepare(
        `
      SELECT COUNT(DISTINCT session_id) as count 
      FROM analytics_events 
      WHERE created_at >= date('now', '-${days} days')
    `
      )
      .get() as { count: number };

    // Top events
    const topEvents = db
      .prepare(
        `
      SELECT event_name as name, COUNT(*) as count 
      FROM analytics_events 
      WHERE created_at >= date('now', '-${days} days')
      GROUP BY event_name 
      ORDER BY count DESC 
      LIMIT 10
    `
      )
      .all() as { name: string; count: number }[];

    // Events by day
    const eventsByDay = db
      .prepare(
        `
      SELECT date(created_at) as date, COUNT(*) as count 
      FROM analytics_events 
      WHERE created_at >= date('now', '-${days} days')
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `
      )
      .all() as { date: string; count: number }[];

    return {
      total_events: totalEvents.count,
      unique_sessions: uniqueSessions.count,
      top_events: topEvents,
      events_by_day: eventsByDay,
    };
  } catch (error) {
    logger.error('Failed to get analytics summary', { error });
    return {
      total_events: 0,
      unique_sessions: 0,
      top_events: [],
      events_by_day: [],
    };
  }
}
