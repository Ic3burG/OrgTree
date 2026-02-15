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

// ============================================================================
// Global Type Declarations (Backend)
// Ambient declarations for Node.js environment and module augmentations
// ============================================================================

// Node.js process environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    JWT_SECRET: string;
    DATABASE_URL?: string;
    FRONTEND_URL?: string;
    SENTRY_DSN?: string;
    RESEND_API_KEY?: string;
    BACKUP_DIR?: string;
    BACKUP_RETENTION?: string;
  }
}

// ============================================================================
// Socket.IO Module Augmentation
// Extends Socket.IO types with our custom user property
// ============================================================================

import { SocketUser } from './index.js';

declare module 'socket.io' {
  interface Socket {
    user: SocketUser;
  }
}

// ============================================================================
// Express Module Augmentation
// (AuthRequest is in index.ts, but we can add more global extensions here if needed)
// ============================================================================

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request {
      // Custom properties can be added here
      // Note: AuthRequest in index.ts is the preferred pattern
    }
  }
}
