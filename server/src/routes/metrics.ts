// ============================================================================
// Metrics Routes
// API endpoints for the application metrics dashboard
// All endpoints require superuser role
// ============================================================================

import express, { Response, NextFunction } from 'express';
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import {
  getOverviewMetrics,
  getUsageMetrics,
  getPerformanceMetrics,
  getAuditMetrics,
} from '../services/metrics.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

// All metrics routes require authentication and superuser role
router.use(authenticateToken);
router.use(requireSuperuser);

/**
 * GET /api/admin/metrics/overview
 * Get summary statistics for the dashboard header
 * Returns: OverviewMetrics
 */
router.get(
  '/admin/metrics/overview',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getOverviewMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/metrics/usage
 * Get usage metrics including user growth, org trends, content volume
 * Returns: UsageMetrics
 */
router.get(
  '/admin/metrics/usage',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getUsageMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/metrics/performance
 * Get performance metrics including memory, uptime, API timing
 * Returns: PerformanceMetrics
 */
router.get(
  '/admin/metrics/performance',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getPerformanceMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/metrics/audit
 * Get audit/security metrics including action distribution, top actors, login stats
 * Returns: AuditMetrics
 */
router.get(
  '/admin/metrics/audit',
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = getAuditMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
