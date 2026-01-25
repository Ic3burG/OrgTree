import express, { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

/**
 * Debug endpoint to check user authentication and org membership
 * GET /api/debug/auth/:orgId
 */
router.get('/auth/:orgId', (req: Request, res: Response): void => {
  const authReq = req as AuthRequest;
  const { orgId } = req.params;

  res.json({
    timestamp: new Date().toISOString(),
    authenticated: !!authReq.user,
    user: authReq.user ? {
      id: authReq.user.id,
      email: authReq.user.email,
      systemRole: authReq.user.role,
    } : null,
    orgId,
    headers: {
      authorization: req.headers.authorization?.substring(0, 20) + '...',
      'user-agent': req.headers['user-agent'],
    },
  });
});

export default router;
