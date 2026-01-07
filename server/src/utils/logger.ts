/**
 * Simple structured logger for production
 * In development: human-readable console logs
 * In production: JSON-formatted logs for log aggregation
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  [key: string]: string | number | boolean | unknown;
}

interface FormattedLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: string | unknown;
}

const isProduction: boolean = process.env.NODE_ENV === 'production';

function formatLog(level: LogLevel, message: string, meta: LogMeta = {}): string {
  const log: FormattedLog = {
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
  info: (message: string, meta?: LogMeta): void => console.log(formatLog('info', message, meta)),
  warn: (message: string, meta?: LogMeta): void => console.warn(formatLog('warn', message, meta)),
  error: (message: string, meta?: LogMeta): void =>
    console.error(formatLog('error', message, meta)),
  debug: (message: string, meta?: LogMeta): void => {
    if (!isProduction) {
      console.debug(formatLog('debug', message, meta));
    }
  },
};

export default logger;
