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

// ============================================================================
// Metrics Type Definitions
// Types for the application metrics dashboard
// ============================================================================

// ============================================================================
// Overview Metrics
// ============================================================================

export interface OverviewMetrics {
  totalUsers: number;
  totalOrganizations: number;
  totalDepartments: number;
  totalPeople: number;
  newUsersToday: number;
  newOrgsToday: number;
  activeUsers24h: number;
  activeConnections: number;
  totalEvents: number;
}

// ============================================================================
// Usage Metrics
// ============================================================================

export interface TrendDataPoint {
  date: string;
  count: number;
}

export interface UsageMetrics {
  userGrowth: TrendDataPoint[];
  orgGrowth: TrendDataPoint[];
  contentVolume: {
    departments: number;
    people: number;
    auditLogs: number;
  };
  activeUsersTrend: TrendDataPoint[];
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

export interface ApiTiming {
  requestsPerMinute: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
}

export interface PerformanceMetrics {
  uptime: number;
  uptimeHuman: string;
  memory: MemoryUsage;
  activeConnections: number;
  apiTiming: ApiTiming;
  database: {
    status: 'connected' | 'error';
    journalMode: string;
    busyTimeoutMs: number;
  };
}

// ============================================================================
// Audit/Security Metrics
// ============================================================================

export interface ActionDistribution {
  actionType: string;
  count: number;
}

export interface TopActor {
  actorId: string;
  actorName: string;
  count: number;
}

export interface LoginStats {
  successful: number;
  failed: number;
  successRate: number;
}

export interface AuditMetrics {
  actionDistribution: ActionDistribution[];
  topActors: TopActor[];
  loginStats24h: LoginStats;
  actionsToday: number;
  actionsThisWeek: number;
  recentActivity: TrendDataPoint[];
}

// ============================================================================
// Real-time Update Payload
// ============================================================================

export interface RealtimeMetricsUpdate {
  timestamp: string;
  activeConnections: number;
  memory: MemoryUsage;
  recentActivityCount: number;
  requestsPerMinute: number;
}

// ============================================================================
// Request Timing Collection
// ============================================================================

export interface RequestTiming {
  timestamp: number;
  method: string;
  path: string;
  duration: number;
  statusCode: number;
}
