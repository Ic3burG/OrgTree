import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all proxy routes
router.use(authenticateToken);

/**
 * GET /api/geds/proxy?url=...
 * Proxies a request to GEDS to bypass CORS and network restrictions
 */
router.get('/proxy', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'Missing URL parameter' });
      return;
    }

    // Safety check: Only allow GEDS domain
    if (!url.startsWith('https://geds-sage.gc.ca')) {
      res.status(400).json({ message: 'Only GEDS-SAGE domain is allowed' });
      return;
    }

    logger.info('Proxying GEDS request', { url, userId: req.user?.id });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OrgTree/1.0 (Organizational Directory App)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      logger.error('GEDS proxy request failed', { 
        url, 
        status: response.status,
        userId: req.user?.id 
      });
      res.status(response.status).json({ message: `GEDS returned error ${response.status}` });
      return;
    }

    // Pass through relevant headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Get the response body as text and send it
    const body = await response.text();
    res.send(body);
  } catch (err) {
    logger.error('GEDS proxy unexpected error', { err, query: req.query });
    next(err);
  }
});

export default router;
