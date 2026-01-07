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
  entityData: any
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
    ).run(id, orgId, actorId, actorName, actionType, entityType, entityId, entityDataJson);

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
  entityData: any;
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
  const params: any[] = [orgId];

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
      whereConditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
      params.push(cursorDate, cursorDate, cursorId);
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

  // Parse entity_data JSON strings
  const parsedLogs: ParsedAuditLog[] = logs.map(log => ({
    id: log.id,
    organizationId: log.organizationId,
    actorId: log.actorId,
    actorName: log.actorName,
    actionType: log.actionType,
    entityType: log.entityType,
    entityId: log.entityId,
    entityData: log.entityData ? JSON.parse(log.entityData) : null,
    createdAt: log.createdAt,
  }));

  // Generate next cursor from last record
  const nextCursor: string | null =
    hasMore && logs.length > 0 ? `${logs[logs.length - 1]!.createdAt}:${logs[logs.length - 1]!.id}` : null;

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
  const params: any[] = [];

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
      whereConditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
      params.push(cursorDate, cursorDate, cursorId);
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

  // Parse entity_data JSON strings
  const parsedLogs: ParsedAllAuditLog[] = logs.map(log => ({
    id: log.id,
    organizationId: log.organizationId,
    organizationName: log.organizationName,
    actorId: log.actorId,
    actorName: log.actorName,
    actionType: log.actionType,
    entityType: log.entityType,
    entityId: log.entityId,
    entityData: log.entityData ? JSON.parse(log.entityData) : null,
    createdAt: log.createdAt,
  }));

  // Generate next cursor from last record
  const nextCursor: string | null =
    hasMore && logs.length > 0 ? `${logs[logs.length - 1]!.createdAt}:${logs[logs.length - 1]!.id}` : null;

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
