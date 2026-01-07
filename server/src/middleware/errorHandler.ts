import type { Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';

interface ErrorWithStatus extends Error {
  status?: number;
}

export function errorHandler(err: ErrorWithStatus, req: AuthRequest, res: Response, _next: NextFunction): void {
  // Log error with context
  logger.error(err.message, {
    error: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  if (err.name === 'ValidationError') {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
}
