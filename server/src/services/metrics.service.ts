// ============================================================================
// Metrics Service
// Database queries and aggregation for the metrics dashboard
// ============================================================================

import db from '../db.js';
import type {
  OverviewMetrics,
  UsageMetrics,
  PerformanceMetrics,
  AuditMetrics,
  TrendDataPoint,
  ActionDistribution,
  TopActor,
} from '../types/metrics.js';
import { getActiveConnectionCount } from '../socket.js';
import { getApiTimingStats } from './metrics-collector.service.js';

// ============================================================================
// Simple TTL Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number, fn: () => T): T {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = fn();
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

// ============================================================================
// Overview Metrics
// ============================================================================

export function getOverviewMetrics(): OverviewMetrics {
  // Cache overview for 30 seconds
  return getCached('overview', 30000, () => {
    const totalUsers = (
      db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
    ).count;

    const totalOrganizations = (
      db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number }
    ).count;

    const totalDepartments = (
      db
        .prepare('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL')
        .get() as { count: number }
    ).count;

    const totalPeople = (
      db.prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL').get() as {
        count: number;
      }
    ).count;

    const newUsersToday = (
      db
        .prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')")
        .get() as { count: number }
    ).count;

    const newOrgsToday = (
      db
        .prepare("SELECT COUNT(*) as count FROM organizations WHERE date(created_at) = date('now')")
        .get() as { count: number }
    ).count;

    const activeUsers24h = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT actor_id) as count FROM audit_logs
           WHERE created_at >= datetime('now', '-24 hours') AND actor_id IS NOT NULL`
        )
        .get() as { count: number }
    ).count;

    return {
      totalUsers,
      totalOrganizations,
      totalDepartments,
      totalPeople,
      newUsersToday,
      newOrgsToday,
      activeUsers24h,
      activeConnections: getActiveConnectionCount(),
    };
  });
}

// ============================================================================
// Usage Metrics
// ============================================================================

export function getUsageMetrics(): UsageMetrics {
  // Cache usage for 60 seconds
  return getCached('usage', 60000, () => {
    // User growth (30 days)
    const userGrowth = db
      .prepare(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM users
         WHERE created_at >= date('now', '-30 days')
         GROUP BY date(created_at)
         ORDER BY date ASC`
      )
      .all() as TrendDataPoint[];

    // Organization growth (30 days)
    const orgGrowth = db
      .prepare(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM organizations
         WHERE created_at >= date('now', '-30 days')
         GROUP BY date(created_at)
         ORDER BY date ASC`
      )
      .all() as TrendDataPoint[];

    // Content volume
    const departmentCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL')
        .get() as { count: number }
    ).count;

    const peopleCount = (
      db.prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL').get() as {
        count: number;
      }
    ).count;

    const auditLogCount = (
      db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number }
    ).count;

    // Active users trend (7 days)
    const activeUsersTrend = db
      .prepare(
        `SELECT date(created_at) as date, COUNT(DISTINCT actor_id) as count
         FROM audit_logs
         WHERE created_at >= date('now', '-7 days') AND actor_id IS NOT NULL
         GROUP BY date(created_at)
         ORDER BY date ASC`
      )
      .all() as TrendDataPoint[];

    return {
      userGrowth,
      orgGrowth,
      contentVolume: {
        departments: departmentCount,
        people: peopleCount,
        auditLogs: auditLogCount,
      },
      activeUsersTrend,
    };
  });
}

// ============================================================================
// Performance Metrics
// ============================================================================

export function getPerformanceMetrics(): PerformanceMetrics {
  // Performance metrics are real-time, minimal caching (5 seconds)
  return getCached('performance', 5000, () => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Database status check
    let dbStatus: 'connected' | 'error' = 'connected';
    let journalMode = 'unknown';
    let busyTimeout = 0;

    try {
      db.prepare('SELECT 1').get();
      journalMode = db.pragma('journal_mode', { simple: true }) as string;
      busyTimeout = db.pragma('busy_timeout', { simple: true }) as number;
    } catch {
      dbStatus = 'error';
    }

    // API timing from collector
    const apiTiming = getApiTimingStats();

    return {
      uptime,
      uptimeHuman: formatUptime(uptime),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      activeConnections: getActiveConnectionCount(),
      apiTiming,
      database: {
        status: dbStatus,
        journalMode,
        busyTimeoutMs: busyTimeout,
      },
    };
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// ============================================================================
// Audit/Security Metrics
// ============================================================================

export function getAuditMetrics(): AuditMetrics {
  // Cache audit metrics for 60 seconds
  return getCached('audit', 60000, () => {
    // Action distribution (7 days)
    const actionDistribution = db
      .prepare(
        `SELECT action_type as actionType, COUNT(*) as count
         FROM audit_logs
         WHERE created_at >= datetime('now', '-7 days')
         GROUP BY action_type
         ORDER BY count DESC
         LIMIT 10`
      )
      .all() as ActionDistribution[];

    // Top actors (7 days)
    const topActors = db
      .prepare(
        `SELECT actor_id as actorId, actor_name as actorName, COUNT(*) as count
         FROM audit_logs
         WHERE created_at >= datetime('now', '-7 days') AND actor_id IS NOT NULL
         GROUP BY actor_id, actor_name
         ORDER BY count DESC
         LIMIT 10`
      )
      .all() as TopActor[];

    // Login stats (24h)
    const successfulLogins = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM audit_logs
           WHERE created_at >= datetime('now', '-24 hours')
           AND action_type = 'login' AND entity_type = 'user'`
        )
        .get() as { count: number }
    ).count;

    const failedLogins = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM audit_logs
           WHERE created_at >= datetime('now', '-24 hours')
           AND action_type = 'login_failed'`
        )
        .get() as { count: number }
    ).count;

    const totalLogins = successfulLogins + failedLogins;
    const successRate = totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 100;

    // Actions today and this week
    const actionsToday = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM audit_logs
           WHERE date(created_at) = date('now')`
        )
        .get() as { count: number }
    ).count;

    const actionsThisWeek = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM audit_logs
           WHERE created_at >= date('now', '-7 days')`
        )
        .get() as { count: number }
    ).count;

    // Recent activity trend (7 days, by day)
    const recentActivity = db
      .prepare(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM audit_logs
         WHERE created_at >= date('now', '-7 days')
         GROUP BY date(created_at)
         ORDER BY date ASC`
      )
      .all() as TrendDataPoint[];

    return {
      actionDistribution,
      topActors,
      loginStats24h: {
        successful: successfulLogins,
        failed: failedLogins,
        successRate: Math.round(successRate * 10) / 10,
      },
      actionsToday,
      actionsThisWeek,
      recentActivity,
    };
  });
}

// ============================================================================
// Real-time Metrics Snapshot (lightweight, for Socket.IO)
// ============================================================================

export function getRealtimeSnapshot() {
  const memoryUsage = process.memoryUsage();
  const apiTiming = getApiTimingStats();

  // Get recent activity count (last 5 minutes)
  const recentActivityCount = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs
         WHERE created_at >= datetime('now', '-5 minutes')`
      )
      .get() as { count: number }
  ).count;

  return {
    timestamp: new Date().toISOString(),
    activeConnections: getActiveConnectionCount(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    recentActivityCount,
    requestsPerMinute: apiTiming.requestsPerMinute,
  };
}
