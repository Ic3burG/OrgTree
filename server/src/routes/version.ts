import express, { Request, Response } from 'express';

const router = express.Router();

// Update this with each deploy to track which version is running
const DEPLOY_VERSION = 'ff63b27-search-fixes';
const DEPLOY_DATE = '2026-01-25';

/**
 * GET /api/version
 * Returns deployment version information
 */
router.get('/version', (_req: Request, res: Response): void => {
  res.json({
    version: DEPLOY_VERSION,
    deployDate: DEPLOY_DATE,
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: {
      searchPermissionFix: true,
      ftsRebuildComplete: true,
      viewerCanSearch: true,
    },
  });
});

export default router;
