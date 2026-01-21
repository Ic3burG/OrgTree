// ============================================================================
// Metrics Type Definitions
// Types for the application metrics dashboard
// ============================================================================

// ============================================================================
// Overview Metrics
// ============================================================================

export interface OverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  totalOrgs: number;
  totalDepartments: number;
  totalPeople: number;
  totalEvents?: number; // From analytics
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
