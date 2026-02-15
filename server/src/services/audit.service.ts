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

import db from '../db.js';
import { randomUUID } from 'crypto';
import type { DatabaseAuditLog } from '../types/index.js';

interface Actor {
  id?: string;
  name?: string;
  email?: string;
}

/**
 * Create an audit log entry
 */
export function createAuditLog(
  orgId: string | null,
  actor: Actor | null,
  actionType: string,
  entityType: string,
  entityId: string | null,
  entityData: Record<string, unknown> | null
): { id: string } | null {
  try {
    const id = randomUUID();
    const actorId = actor?.id || null;
    const actorName = actor?.name || 'System';
    const entityDataJson = entityData ? JSON.stringify(entityData) : null;

    db.prepare(
      `
      INSERT INTO audit_logs (
        id, organization_id, actor_id, actor_name, action_type,
        entity_type, entity_id, entity_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    ).run(
      id,
      orgId, // Can be null for system-level events (e.g., failed login attempts)
      actorId,
      actorName,
      actionType,
      entityType,
      entityId,
      entityDataJson
    );

    return { id };
  } catch (err) {
    console.error('Failed to create audit log:', err);
    // Don't throw - audit logging should not break normal operations
    return null;
  }
}

interface GetAuditLogsOptions {
  limit?: number;
  cursor?: string;
  actionType?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

interface ParsedAuditLog {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  actorName: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  entityData: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogsResult {
  logs: ParsedAuditLog[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Get audit logs for an organization with filters and pagination
 */
export function getAuditLogs(orgId: string, options: GetAuditLogsOptions = {}): AuditLogsResult {
  const limit = parseInt(String(options.limit || 50));
  const { cursor, actionType, entityType, startDate, endDate } = options;

  // Build WHERE clause
  const whereConditions: string[] = ['organization_id = ?'];
  const params: (string | number)[] = [orgId];

  if (actionType) {
    whereConditions.push('action_type = ?');
    params.push(actionType);
  }

  if (entityType) {
    whereConditions.push('entity_type = ?');
    params.push(entityType);
  }

  if (startDate) {
    whereConditions.push('created_at >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('created_at <= ?');
    params.push(endDate);
  }

  // Handle cursor pagination
  if (cursor) {
    try {
      const [cursorDate, cursorId] = cursor.split(':');
      if (cursorDate && cursorId) {
        whereConditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
        params.push(cursorDate, cursorDate, cursorId);
      }
    } catch (err) {
      console.error('Invalid cursor format:', err);
    }
  }

  const whereClause = whereConditions.join(' AND ');

  // Fetch limit + 1 to check if there are more records
  const query = `
    SELECT
      id,
      organization_id AS organizationId,
      actor_id AS actorId,
      actor_name AS actorName,
      action_type AS actionType,
      entity_type AS entityType,
      entity_id AS entityId,
      entity_data AS entityData,
      created_at AS createdAt
    FROM audit_logs
    WHERE ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `;

  params.push(limit + 1);

  const logs = db.prepare(query).all(...params) as DatabaseAuditLog[];

  // Check if there are more records
  const hasMore = logs.length > limit;
  if (hasMore) {
    logs.pop(); // Remove the extra record
  }

  // Parse entity_data JSON strings and convert timestamps to ISO format
  const parsedLogs: ParsedAuditLog[] = logs.map(log => {
    // SQLite returns timestamps as 'YYYY-MM-DD HH:MM:SS' (UTC without timezone)
    // Convert to ISO format with 'Z' suffix to indicate UTC for proper JavaScript Date parsing
    let createdAt = log.createdAt;
    if (createdAt && !createdAt.includes('T')) {
      createdAt = `${createdAt.replace(' ', 'T')}Z`;
    }

    return {
      id: log.id,
      organizationId: log.organizationId,
      actorId: log.actorId,
      actorName: log.actorName,
      actionType: log.actionType,
      entityType: log.entityType,
      entityId: log.entityId,
      entityData: log.entityData ? JSON.parse(log.entityData) : null,
      createdAt,
    };
  });

  // Generate next cursor from last record
  const nextCursor: string | null =
    hasMore && logs.length > 0
      ? `${logs[logs.length - 1]!.createdAt}:${logs[logs.length - 1]!.id}`
      : null;

  return {
    logs: parsedLogs,
    hasMore,
    nextCursor,
  };
}

interface GetAllAuditLogsOptions extends GetAuditLogsOptions {
  orgId?: string;
}

interface ParsedAllAuditLog extends ParsedAuditLog {
  organizationName: string | null;
}

interface AllAuditLogsResult {
  logs: ParsedAllAuditLog[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Get audit logs across all organizations (superuser only)
 */
export function getAllAuditLogs(options: GetAllAuditLogsOptions = {}): AllAuditLogsResult {
  const limit = parseInt(String(options.limit || 50));
  const { cursor, actionType, entityType, startDate, endDate, orgId } = options;

  // Build WHERE clause
  const whereConditions: string[] = [];
  const params: (string | number)[] = [];

  if (orgId) {
    whereConditions.push('organization_id = ?');
    params.push(orgId);
  }

  if (actionType) {
    whereConditions.push('action_type = ?');
    params.push(actionType);
  }

  if (entityType) {
    whereConditions.push('entity_type = ?');
    params.push(entityType);
  }

  if (startDate) {
    whereConditions.push('created_at >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('created_at <= ?');
    params.push(endDate);
  }

  // Handle cursor pagination
  if (cursor) {
    try {
      const [cursorDate, cursorId] = cursor.split(':');
      if (cursorDate && cursorId) {
        whereConditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
        params.push(cursorDate, cursorDate, cursorId);
      }
    } catch (err) {
      console.error('Invalid cursor format:', err);
    }
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Fetch limit + 1 to check if there are more records
  const query = `
    SELECT
      al.id,
      al.organization_id AS organizationId,
      o.name AS organizationName,
      al.actor_id AS actorId,
      al.actor_name AS actorName,
      al.action_type AS actionType,
      al.entity_type AS entityType,
      al.entity_id AS entityId,
      al.entity_data AS entityData,
      al.created_at AS createdAt
    FROM audit_logs al
    LEFT JOIN organizations o ON al.organization_id = o.id
    ${whereClause}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ?
  `;

  params.push(limit + 1);

  interface RawAllAuditLog extends DatabaseAuditLog {
    organizationName: string | null;
  }

  const logs = db.prepare(query).all(...params) as RawAllAuditLog[];

  // Check if there are more records
  const hasMore = logs.length > limit;
  if (hasMore) {
    logs.pop(); // Remove the extra record
  }

  // Parse entity_data JSON strings and convert timestamps to ISO format
  const parsedLogs: ParsedAllAuditLog[] = logs.map(log => {
    // SQLite returns timestamps as 'YYYY-MM-DD HH:MM:SS' (UTC without timezone)
    // Convert to ISO format with 'Z' suffix to indicate UTC for proper JavaScript Date parsing
    let createdAt = log.createdAt;
    if (createdAt && !createdAt.includes('T')) {
      createdAt = `${createdAt.replace(' ', 'T')}Z`;
    }

    return {
      id: log.id,
      organizationId: log.organizationId,
      organizationName: log.organizationName,
      actorId: log.actorId,
      actorName: log.actorName,
      actionType: log.actionType,
      entityType: log.entityType,
      entityId: log.entityId,
      entityData: log.entityData ? JSON.parse(log.entityData) : null,
      createdAt,
    };
  });

  // Generate next cursor from last record
  const nextCursor: string | null =
    hasMore && logs.length > 0
      ? `${logs[logs.length - 1]!.createdAt}:${logs[logs.length - 1]!.id}`
      : null;

  return {
    logs: parsedLogs,
    hasMore,
    nextCursor,
  };
}

/**
 * Delete audit logs older than 1 year
 */
export function cleanupOldLogs(): number {
  try {
    const result = db
      .prepare(
        `
      DELETE FROM audit_logs
      WHERE created_at < date('now', '-1 year')
    `
      )
      .run();

    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} old audit logs`);
    }

    return result.changes;
  } catch (err) {
    console.error('Failed to cleanup old audit logs:', err);
    return 0;
  }
}

interface AuditFilterOptions {
  actionTypes: string[];
  entityTypes: string[];
}

/**
 * Get distinct action types and entity types from audit logs
 * Used to populate filter dropdowns dynamically
 */
export function getAuditFilterOptions(): AuditFilterOptions {
  try {
    // Get distinct action types
    const actionTypes = db
      .prepare(
        `
      SELECT DISTINCT action_type
      FROM audit_logs
      WHERE action_type IS NOT NULL
      ORDER BY action_type ASC
    `
      )
      .all() as Array<{ action_type: string }>;

    // Get distinct entity types
    const entityTypes = db
      .prepare(
        `
      SELECT DISTINCT entity_type
      FROM audit_logs
      WHERE entity_type IS NOT NULL
      ORDER BY entity_type ASC
    `
      )
      .all() as Array<{ entity_type: string }>;

    return {
      actionTypes: actionTypes.map(row => row.action_type),
      entityTypes: entityTypes.map(row => row.entity_type),
    };
  } catch (err) {
    console.error('Failed to get audit filter options:', err);
    return {
      actionTypes: [],
      entityTypes: [],
    };
  }
}
