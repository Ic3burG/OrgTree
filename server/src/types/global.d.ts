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
    interface Request {
      // Custom properties can be added here
      // Note: AuthRequest in index.ts is the preferred pattern
    }
  }
}
