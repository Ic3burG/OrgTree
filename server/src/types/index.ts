// ============================================================================
// Backend Type Definitions
// Extends shared types with backend-specific types
// ============================================================================

import { Request } from 'express';
import type { Database as SQLiteDatabase } from 'better-sqlite3';

// Re-export all shared types for convenience
export * from '../../../src/types/index.js';

// ============================================================================
// Express Extensions
// ============================================================================

// Extend Express Request with authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin' | 'superuser';
  };
}

// ============================================================================
// Database Query Result Types
// SQLite returns specific formats that need conversion
// ============================================================================

export interface DatabaseUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'user' | 'admin' | 'superuser';
  totp_secret?: string | null;
  totp_enabled?: number; // SQLite boolean (0 or 1)
  must_change_password?: number; // SQLite boolean (0 or 1)
  is_discoverable?: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface DatabaseOrganization {
  id: string;
  name: string;
  created_by_id: string;
  is_public: number; // SQLite boolean (0 or 1)
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
}

export interface DatabaseDepartment {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabasePerson {
  id: string;
  department_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_starred: number; // SQLite boolean (0 or 1)
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  token: string;
  expires_at: string;
  created_by_id: string;
  created_at: string;
}

export interface DatabaseRefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  device_info: string | null;
  ip_address: string | null;
  expires_at: string;
  last_used_at: string;
  created_at: string;
  revoked_at: string | null;
}

export interface DatabaseAuditLog {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  actorName: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  entityData: string | null; // JSON string in SQLite
  createdAt: string;
}

// ============================================================================
// Service Return Types
// ============================================================================

export interface CreateUserResult {
  user: DatabaseUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: DatabaseUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  requiresTwoFactor?: boolean;
  tempUserId?: string;
}

export interface RefreshResult {
  accessToken: string;
  user: DatabaseUser;
  expiresIn: number;
}

export interface OrgAccessCheck {
  hasAccess: boolean;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  canEdit?: boolean;
  canDelete?: boolean;
  canInvite?: boolean;
  canManageMembers?: boolean;
}

// ============================================================================
// JWT Payload
// ============================================================================

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'superuser';
  iat?: number;
  exp?: number;
}

// ============================================================================
// Socket.IO Types
// ============================================================================

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'superuser';
}

// ============================================================================
// CSRF Types
// ============================================================================

export interface CSRFTokenData {
  token: string;
  signature: string;
  timestamp: number;
}

// ============================================================================
// Backup Types
// ============================================================================

export interface BackupMetadata {
  filename: string;
  path: string;
  size: number;
  created: Date;
  timestamp: string;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup: BackupMetadata | null;
  newestBackup: BackupMetadata | null;
}

// ============================================================================
// Custom Error Type
// ============================================================================

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'AppError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// ============================================================================
// Database Type (better-sqlite3)
// ============================================================================

export type Database = SQLiteDatabase;

// ============================================================================
// Utility Types
// ============================================================================

// Helper to convert SQLite boolean (0/1) to TypeScript boolean
export type SQLiteBoolean = 0 | 1;

// Helper to make specific fields required
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Helper to make specific fields optional
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Ownership Transfer Types
// ============================================================================

export interface OwnershipTransfer {
  id: string;
  organizationId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  initiatedAt: string;
  expiresAt: string;
  completedAt: string | null;
  reason: string;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipTransferWithDetails extends OwnershipTransfer {
  from_user_name: string;
  from_user_email: string;
  to_user_name: string;
  to_user_email: string;
  organization_name: string;
}

export interface OwnershipTransferAuditLog {
  id: string;
  transferId: string;
  action: 'initiated' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  actorId: string;
  actorRole: string;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: number;
}
