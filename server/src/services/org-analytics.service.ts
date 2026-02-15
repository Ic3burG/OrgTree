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

import db from '../db.js';
import logger from '../utils/logger.js';

export interface OrgAnalyticsOverview {
  totalDepartments: number;
  totalPeople: number;
  totalMembers: number;
  departmentGrowth30d: number; // % change
  peopleGrowth30d: number;
  avgUpdatesPerDay: number;
  activeUsers7d: number;
  publicLinkViews30d: number;
  lastActivityAt: string | null;
}

export interface GrowthTrend {
  date: string; // ISO date
  departmentCount: number;
  peopleCount: number;
  memberCount: number;
}

export interface StructuralHealth {
  maxDepth: number;
  avgDepth: number;
  avgSpanOfControl: number; // avg direct reports per manager
  largestDepartment: { id: string; name: string; size: number } | null;
  orphanedPeople: number; // people in deleted departments or no department
  emptyDepartments: number; // departments with 0 people
}

export interface ActivityMetrics {
  totalEdits: number;
  editsPerDay: { date: string; count: number }[];
  publicLinkViewsPerDay: { date: string; count: number }[];
  topEditors: { userId: string; name: string; email: string; editCount: number }[];
  peakActivityHour: number; // 0-23
  recentActions: { action: string; count: number }[]; // created/updated/deleted
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueSearchers: number;
  topQueries: { query: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
  avgResultsPerSearch: number;
}

/**
 * Get high-level analytics overview for an organization
 */
export function getOrgAnalyticsOverview(orgId: string): OrgAnalyticsOverview {
  try {
    // Current counts
    const counts = db
      .prepare(
        `
      SELECT 
        (SELECT COUNT(*) FROM departments WHERE organization_id = @orgId AND deleted_at IS NULL) as deptCount,
        (SELECT COUNT(*) FROM people p JOIN departments d ON p.department_id = d.id WHERE d.organization_id = @orgId AND p.deleted_at IS NULL AND d.deleted_at IS NULL) as peopleCount,
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = @orgId) as memberCount
    `
      )
      .get({ orgId }) as { deptCount: number; peopleCount: number; memberCount: number };

    // Growth inputs (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const oldCounts = db
      .prepare(
        `
      SELECT 
        (SELECT COUNT(*) FROM departments WHERE organization_id = @orgId AND created_at <= @date AND deleted_at IS NULL) as deptCount,
        (SELECT COUNT(*) FROM people p JOIN departments d ON p.department_id = d.id WHERE d.organization_id = @orgId AND p.created_at <= @date AND p.deleted_at IS NULL AND d.deleted_at IS NULL) as peopleCount
    `
      )
      .get({ orgId, date: thirtyDaysAgoStr }) as { deptCount: number; peopleCount: number };

    // Calculate growth percentages
    const calculateGrowth = (current: number, old: number) => {
      if (old === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - old) / old) * 100);
    };

    // Activity stats
    const activityStats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as totalEdits,
        MAX(created_at) as lastActivity
      FROM audit_logs 
      WHERE organization_id = @orgId 
      AND created_at >= @date
    `
      )
      .get({ orgId, date: thirtyDaysAgoStr }) as { totalEdits: number; lastActivity: string };

    const activeUsers = db
      .prepare(
        `
      SELECT COUNT(DISTINCT user_id) as count
      FROM analytics_events 
      WHERE properties LIKE '%"organization_id":"' || @orgId || '"%'
      AND created_at >= date('now', '-7 days')
    `
      )
      .get({ orgId }) as { count: number };

    const publicViews = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM analytics_events
      WHERE event_name = 'public_link_view'
      AND properties LIKE '%"organization_id":"' || @orgId || '"%'
      AND created_at >= date('now', '-30 days')
    `
      )
      .get({ orgId }) as { count: number };

    return {
      totalDepartments: counts.deptCount,
      totalPeople: counts.peopleCount,
      totalMembers: counts.memberCount,
      departmentGrowth30d: calculateGrowth(counts.deptCount, oldCounts.deptCount),
      peopleGrowth30d: calculateGrowth(counts.peopleCount, oldCounts.peopleCount),
      avgUpdatesPerDay: Math.round((activityStats.totalEdits / 30) * 10) / 10,
      activeUsers7d: activeUsers?.count || 0,
      publicLinkViews30d: publicViews?.count || 0,
      lastActivityAt: activityStats.lastActivity || null,
    };
  } catch (error) {
    logger.error('Failed to get org analytics overview', { error, orgId });
    throw error;
  }
}

/**
 * Get growth trends over time
 */
export function getOrgGrowthTrends(
  orgId: string,
  period: '7d' | '30d' | '90d' | '1y'
): GrowthTrend[] {
  try {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

    // We'll generate a series of dates and aggregate counts for each
    // This is a simplified approach; primarily using created_at.
    // It doesn't account for deletions perfectly but gives a good trend line.
    const trends = db
      .prepare(
        `
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-' || @days || ' days')
        UNION ALL
        SELECT date(date, '+1 day')
        FROM dates
        WHERE date < date('now')
      )
      SELECT 
        d.date,
        (SELECT COUNT(*) FROM departments dept WHERE dept.organization_id = @orgId AND date(dept.created_at) <= d.date AND dept.deleted_at IS NULL) as departmentCount,
        (SELECT COUNT(*) FROM people p JOIN departments dept ON p.department_id = dept.id WHERE dept.organization_id = @orgId AND date(p.created_at) <= d.date AND p.deleted_at IS NULL AND dept.deleted_at IS NULL) as peopleCount,
        (SELECT COUNT(*) FROM organization_members m WHERE m.organization_id = @orgId AND date(m.created_at) <= d.date) as memberCount
      FROM dates d
    `
      )
      .all({ orgId, days }) as GrowthTrend[];

    return trends;
  } catch (error) {
    logger.error('Failed to get org growth trends', { error, orgId });
    throw error;
  }
}

/**
 * Get structural health metrics
 */
export function getOrgStructuralHealth(orgId: string): StructuralHealth {
  try {
    // Empty departments (departments with no people)
    const emptyDepts = db
      .prepare(
        `
      SELECT d.id
      FROM departments d
      LEFT JOIN people p ON p.department_id = d.id AND p.deleted_at IS NULL
      WHERE d.organization_id = @orgId AND d.deleted_at IS NULL
      GROUP BY d.id
      HAVING COUNT(p.id) = 0
    `
      )
      .all({ orgId });

    const emptyDepartmentsCount = emptyDepts.length;

    // Orphaned people (people in departments that don't exist or are deleted)
    const orphanedPeople = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM people p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE (d.id IS NULL OR d.deleted_at IS NOT NULL)
      AND p.deleted_at IS NULL
      AND d.organization_id = @orgId
    `
      )
      .get({ orgId }) as { count: number };

    // Largest department
    const largestDept = db
      .prepare(
        `
      SELECT d.id, d.name, COUNT(p.id) as size
      FROM departments d
      JOIN people p ON p.department_id = d.id
      WHERE d.organization_id = @orgId AND d.deleted_at IS NULL AND p.deleted_at IS NULL
      GROUP BY d.id
      ORDER BY size DESC
      LIMIT 1
    `
      )
      .get({ orgId }) as { id: string; name: string; size: number } | undefined;

    // Span of control (avg reports per manager)
    // NOTE: 'manager_id' does not exist in the current schema yet.
    // Returning 0 for now until the feature is implemented.
    const avgSpanOfControl = 0;

    // Depth analysis requires recursive CTE
    const depthStats = db
      .prepare(
        `
      WITH RECURSIVE dept_tree AS (
        SELECT id, parent_id, 1 as depth
        FROM departments
        WHERE organization_id = @orgId AND parent_id IS NULL AND deleted_at IS NULL
        
        UNION ALL
        
        SELECT d.id, d.parent_id, dt.depth + 1
        FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
        WHERE d.organization_id = @orgId AND d.deleted_at IS NULL
      )
      SELECT MAX(depth) as maxDepth, AVG(depth) as avgDepth
      FROM dept_tree
    `
      )
      .get({ orgId }) as { maxDepth: number; avgDepth: number };

    return {
      maxDepth: depthStats?.maxDepth || 0,
      avgDepth: Math.round((depthStats?.avgDepth || 0) * 10) / 10,
      avgSpanOfControl: avgSpanOfControl,
      largestDepartment: largestDept || null,
      orphanedPeople: orphanedPeople.count,
      emptyDepartments: emptyDepartmentsCount,
    };
  } catch (error) {
    logger.error('Failed to get structural health', { error, orgId });
    throw error;
  }
}

/**
 * Get activity metrics
 */
export function getOrgActivityMetrics(
  orgId: string,
  period: '7d' | '30d' | '90d'
): ActivityMetrics {
  try {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as totalEdits,
        strftime('%H', created_at) as hour,
        COUNT(*) as hourCount
      FROM audit_logs
      WHERE organization_id = @orgId 
      AND created_at >= date('now', '-' || @days || ' days')
      GROUP BY hour
      ORDER BY hourCount DESC
    `
      )
      .all({ orgId, days }) as { totalEdits: number; hour: string; hourCount: number }[];

    const totalEdits = stats.reduce((acc, curr) => acc + curr.hourCount, 0);
    const peakActivityHour = stats.length > 0 && stats[0] ? parseInt(stats[0].hour) : 0;

    const editsPerDay = db
      .prepare(
        `
      SELECT date(created_at) as date, COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = @orgId 
      AND created_at >= date('now', '-' || @days || ' days')
      GROUP BY date
      ORDER BY date
    `
      )
      .all({ orgId, days }) as { date: string; count: number }[];

    const publicViewsPerDay = db
      .prepare(
        `
      SELECT date(created_at) as date, COUNT(*) as count
      FROM analytics_events
      WHERE event_name = 'public_link_view'
      AND properties LIKE '%"organization_id":"' || @orgId || '"%'
      AND created_at >= date('now', '-' || @days || ' days')
      GROUP BY date
      ORDER BY date
    `
      )
      .all({ orgId, days }) as { date: string; count: number }[];

    const topEditors = db
      .prepare(
        `
      SELECT 
        a.actor_id as userId, 
        u.name,
        u.email,
        COUNT(*) as editCount
      FROM audit_logs a
      JOIN users u ON a.actor_id = u.id
      WHERE a.organization_id = @orgId 
      AND a.created_at >= date('now', '-' || @days || ' days')
      GROUP BY a.actor_id
      ORDER BY editCount DESC
      LIMIT 5
    `
      )
      .all({ orgId, days }) as { userId: string; name: string; email: string; editCount: number }[];

    const recentActions = db
      .prepare(
        `
      SELECT action_type as action, COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = @orgId 
      AND created_at >= date('now', '-' || @days || ' days')
      GROUP BY action_type
      ORDER BY count DESC
    `
      )
      .all({ orgId, days }) as { action: string; count: number }[];

    return {
      totalEdits,
      editsPerDay,
      publicViewsPerDay,
      topEditors,
      peakActivityHour,
      recentActions,
    };
  } catch (error) {
    logger.error('Failed to get activity metrics', { error, orgId });
    throw error;
  }
}

/**
 * Get search analytics
 */
export function getOrgSearchAnalytics(orgId: string, _period: '30d'): SearchAnalytics {
  try {
    const days = 30; // restricted to 30d for now

    const searchStats = db
      .prepare(
        `
        SELECT 
            COUNT(*) as total,
            COUNT(DISTINCT user_id) as uniqueUsers,
            AVG(result_count) as avgResults
        FROM search_analytics
        WHERE organization_id = @orgId
        AND created_at >= date('now', '-' || @days || ' days')
    `
      )
      .get({ orgId, days }) as { total: number; uniqueUsers: number; avgResults: number };

    const topQueries = db
      .prepare(
        `
        SELECT 
            query,
            COUNT(*) as count
        FROM search_analytics
        WHERE organization_id = @orgId
        AND created_at >= date('now', '-' || @days || ' days')
        GROUP BY query
        ORDER BY count DESC
        LIMIT 10
    `
      )
      .all({ orgId, days }) as { query: string; count: number }[];

    // For "zero results", we find queries where result_count = 0
    const zeroResultQueries = db
      .prepare(
        `
        SELECT 
            query,
            COUNT(*) as count
        FROM search_analytics
        WHERE organization_id = @orgId
        AND result_count = 0
        AND created_at >= date('now', '-' || @days || ' days')
        GROUP BY query
        ORDER BY count DESC
        LIMIT 10
    `
      )
      .all({ orgId, days }) as { query: string; count: number }[];

    return {
      totalSearches: searchStats.total || 0,
      uniqueSearchers: searchStats.uniqueUsers || 0,
      topQueries: topQueries || [],
      zeroResultQueries: zeroResultQueries || [],
      avgResultsPerSearch: Math.round((searchStats.avgResults || 0) * 10) / 10,
    };
  } catch (error) {
    logger.error('Failed to get search analytics', { error, orgId });
    throw error;
  }
}
