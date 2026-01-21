// ============================================================================
// Metrics Middleware
// Express middleware to track request timing
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { recordRequestTiming } from '../services/metrics-collector.service.js';

/**
 * Middleware to record API request timing
 * Should be applied early in the middleware chain
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Skip health checks and static assets to reduce noise
  if (req.path === '/api/health' || !req.path.startsWith('/api')) {
    return next();
  }

  // Record timing on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    recordRequestTiming({
      timestamp: startTime,
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
    });
  });

  next();
}
