/**
 * Simple structured logger for production
 * In development: human-readable console logs
 * In production: JSON-formatted logs for log aggregation
 */

const isProduction = process.env.NODE_ENV === 'production';

function formatLog(level, message, meta = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  return isProduction
    ? JSON.stringify(log)
    : `[${log.timestamp}] ${level.toUpperCase()}: ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
}

export const logger = {
  info: (message, meta) => console.log(formatLog('info', message, meta)),
  warn: (message, meta) => console.warn(formatLog('warn', message, meta)),
  error: (message, meta) => console.error(formatLog('error', message, meta)),
  debug: (message, meta) => {
    if (!isProduction) {
      console.debug(formatLog('debug', message, meta));
    }
  },
};

export default logger;
