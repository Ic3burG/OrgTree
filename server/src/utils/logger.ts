/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
