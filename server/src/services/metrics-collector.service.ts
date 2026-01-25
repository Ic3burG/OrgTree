// ============================================================================
// Metrics Collector Service
// In-memory collection of API request timing data
// ============================================================================

import type { RequestTiming, ApiTiming } from '../types/metrics.js';

// ============================================================================
// Configuration
// ============================================================================

const MAX_SAMPLES = 1000; // Maximum number of timing samples to keep
const WINDOW_MS = 60 * 1000; // 1 minute window for rate calculations

// ============================================================================
// In-memory Storage
// ============================================================================

const timings: RequestTiming[] = [];

// ============================================================================
// Collection Functions
// ============================================================================

/**
 * Record a request timing sample
 */
export function recordRequestTiming(timing: RequestTiming): void {
  // Add to array
  timings.push(timing);

  // Prune old samples to prevent memory growth
  pruneOldSamples();
}

/**
 * Remove samples older than the window and excess samples
 */
function pruneOldSamples(): void {
  const cutoff = Date.now() - WINDOW_MS;

  // Remove samples older than window
  while (timings.length > 0 && timings[0]!.timestamp < cutoff) {
    timings.shift();
  }

  // Hard limit to prevent memory issues
  while (timings.length > MAX_SAMPLES) {
    timings.shift();
  }
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Get API timing statistics
 */
export function getApiTimingStats(): ApiTiming {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Filter to samples within window
  const recentTimings = timings.filter(t => t.timestamp >= cutoff);

  if (recentTimings.length === 0) {
    return {
      requestsPerMinute: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      errorRate: 0,
    };
  }

  // Calculate requests per minute
  const requestsPerMinute = recentTimings.length;

  // Calculate average response time
  const totalDuration = recentTimings.reduce((sum, t) => sum + t.duration, 0);
  const avgResponseTime = Math.round(totalDuration / recentTimings.length);

  // Calculate p95 response time
  const sortedDurations = recentTimings.map(t => t.duration).sort((a, b) => a - b);
  const p95Index = Math.floor(sortedDurations.length * 0.95);
  const p95ResponseTime = sortedDurations[p95Index] ?? 0;

  // Calculate error rate
  const recentErrors = recentTimings.filter(t => t.statusCode >= 400).length;
  const errorRate =
    recentTimings.length > 0
      ? Math.round((recentErrors / recentTimings.length) * 100 * 10) / 10
      : 0;

  return {
    requestsPerMinute,
    avgResponseTime,
    p95ResponseTime: Math.round(p95ResponseTime),
    errorRate,
  };
}

/**
 * Get raw timing data for analysis (limited to recent samples)
 */
export function getRecentTimings(limit = 100): RequestTiming[] {
  return timings.slice(-limit);
}

/**
 * Reset all collected metrics (for testing)
 */
export function resetMetrics(): void {
  timings.length = 0;
}