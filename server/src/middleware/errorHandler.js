import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // Log error with context
  logger.error(err.message, {
    error: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error'
  });
}
