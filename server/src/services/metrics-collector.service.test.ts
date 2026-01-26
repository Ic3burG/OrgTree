import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordRequestTiming,
  getApiTimingStats,
  getRecentTimings,
  resetMetrics,
} from './metrics-collector.service.js';

describe('Metrics Collector Service', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should record and retrieve timings', () => {
    const timing = {
      path: '/test',
      method: 'GET',
      statusCode: 200,
      duration: 100,
      timestamp: Date.now(),
    };

    recordRequestTiming(timing);
    const recent = getRecentTimings();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toEqual(timing);
  });

  it('should calculate stats correctly', () => {
    const now = Date.now();
    recordRequestTiming({
      path: '/1',
      method: 'GET',
      statusCode: 200,
      duration: 50,
      timestamp: now,
    });
    recordRequestTiming({
      path: '/2',
      method: 'GET',
      statusCode: 400,
      duration: 150,
      timestamp: now,
    });

    const stats = getApiTimingStats();
    expect(stats.requestsPerMinute).toBe(2);
    expect(stats.avgResponseTime).toBe(100);
    expect(stats.errorRate).toBe(50);
  });

  it('should prune old samples', () => {
    const oldTime = Date.now() - 70000; // 70s ago
    recordRequestTiming({
      path: '/old',
      method: 'GET',
      statusCode: 200,
      duration: 50,
      timestamp: oldTime,
    });

    // Force prune by adding new sample
    recordRequestTiming({
      path: '/new',
      method: 'GET',
      statusCode: 200,
      duration: 50,
      timestamp: Date.now(),
    });

    const recent = getRecentTimings();
    expect(recent).toHaveLength(1);
    expect(recent[0].path).toBe('/new');
  });
});
