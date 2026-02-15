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

import * as Sentry from '@sentry/node';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  // Use dynamic import for dotenv to avoid issues in production where it might not be installed
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch {
    // Ignore error if dotenv is missing
  }
}

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Enable profiling
    // profilesSampleRate is relative to tracesSampleRate
    profilesSampleRate: 1.0,

    // Only send errors in production by default unless debug is on
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

    // Additional context
    serverName: process.env.RENDER_SERVICE_NAME || 'orgtree-server',

    // Filter sensitive data
    beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint): Sentry.ErrorEvent | null {
      // Remove sensitive headers
      if (event.request?.headers && typeof event.request.headers === 'object') {
        const headers = event.request.headers as Record<string, string>;
        delete headers.authorization;
        delete headers.cookie;
      }

      // Remove sensitive data from request body
      if (event.request?.data && typeof event.request.data === 'object') {
        const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'token'];
        const data = event.request.data as Record<string, unknown>;
        sensitiveFields.forEach(field => {
          if (field in data) {
            data[field] = '[REDACTED]';
          }
        });
      }

      return event;
    },
  });

  console.log('Sentry initialized via instrumentation:', process.env.NODE_ENV || 'development');
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Sentry: No DSN configured, skipping instrumentation');
  }
}
