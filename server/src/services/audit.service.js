import db from '../db.js';
import { randomUUID } from 'crypto';

/**
 * Create an audit log entry
 * @param {string} orgId - Organization ID
 * @param {Object} actor - User who performed the action {id, name, email}
 * @param {string} actionType - Action performed (created, updated, deleted, added, removed, settings)
 * @param {string} entityType - Type of entity (department, person, member, org)
 * @param {string} entityId - ID of the affected entity
 * @param {Object} entityData - Entity data snapshot
 */
export function createAuditLog(orgId, actor, actionType, entityType, entityId, entityData) {
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

/**
 * Get audit logs for an organization with filters and pagination
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of records (default 50)
 * @param {string} options.cursor - Pagination cursor (created_at:id)
 * @param {string} options.actionType - Filter by action type
 * @param {string} options.entityType - Filter by entity type
 * @param {string} options.startDate - Filter by start date (ISO string)
 * @param {string} options.endDate - Filter by end date (ISO string)
 * @returns {Object} { logs: [], hasMore: boolean, nextCursor: string }
 */
export function getAuditLogs(orgId, options = {}) {
  const limit = parseInt(options.limit) || 50;
  const { cursor, actionType, entityType, startDate, endDate } = options;

  // Build WHERE clause
  const whereConditions = ['organization_id = ?'];
  const params = [orgId];

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

  const logs = db.prepare(query).all(...params);

  // Check if there are more records
  const hasMore = logs.length > limit;
  if (hasMore) {
    logs.pop(); // Remove the extra record
  }

  // Generate next cursor from last record
  let nextCursor = null;
  if (hasMore && logs.length > 0) {
    const lastLog = logs[logs.length - 1];
    nextCursor = `${lastLog.createdAt}:${lastLog.id}`;
  }

  // Parse entity_data JSON strings
  const parsedLogs = logs.map(log => ({
    ...log,
    entityData: log.entityData ? JSON.parse(log.entityData) : null,
  }));

  return {
    logs: parsedLogs,
    hasMore,
    nextCursor,
  };
}

/**
 * Get audit logs across all organizations (superuser only)
 * @param {Object} options - Query options (same as getAuditLogs but with optional orgId filter)
 * @returns {Object} { logs: [], hasMore: boolean, nextCursor: string }
 */
export function getAllAuditLogs(options = {}) {
  const limit = parseInt(options.limit) || 50;
  const { cursor, actionType, entityType, startDate, endDate, orgId } = options;

  // Build WHERE clause
  const whereConditions = [];
  const params = [];

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

  const logs = db.prepare(query).all(...params);

  // Check if there are more records
  const hasMore = logs.length > limit;
  if (hasMore) {
    logs.pop(); // Remove the extra record
  }

  // Generate next cursor from last record
  let nextCursor = null;
  if (hasMore && logs.length > 0) {
    const lastLog = logs[logs.length - 1];
    nextCursor = `${lastLog.createdAt}:${lastLog.id}`;
  }

  // Parse entity_data JSON strings
  const parsedLogs = logs.map(log => ({
    ...log,
    entityData: log.entityData ? JSON.parse(log.entityData) : null,
  }));

  return {
    logs: parsedLogs,
    hasMore,
    nextCursor,
  };
}

/**
 * Delete audit logs older than 1 year
 * @returns {number} Number of records deleted
 */
export function cleanupOldLogs() {
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
