import { emitToOrg } from '../socket.js';
import { createAuditLog } from './audit.service.js';

interface Actor {
  id: string;
  name: string;
  email?: string;
}

interface EventPayload<T = Record<string, unknown>> {
  type: string;
  action: string;
  data: T;
  meta: {
    actorId: string | null;
    actorName: string;
    timestamp: string;
  };
}

/**
 * Creates a standardized event payload and persists audit log
 */
function createPayload<T extends { id?: string }>(
  orgId: string | null,
  type: string,
  action: string,
  data: T,
  actor: Actor | null
): EventPayload<T> {
  // Persist audit log to database
  createAuditLog(orgId, actor, action, type, data?.id || null, data);

  return {
    type,
    action,
    data,
    meta: {
      actorId: actor?.id || null,
      actorName: actor?.name || 'System',
      timestamp: new Date().toISOString(),
    },
  };
}

// Department events
export function emitDepartmentCreated(orgId: string, department: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'department', 'created', department, actor);
  emitToOrg(orgId, 'department:created', payload);
}

export function emitDepartmentUpdated(orgId: string, department: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'department', 'updated', department, actor);
  emitToOrg(orgId, 'department:updated', payload);
}

export function emitDepartmentDeleted(orgId: string, department: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'department', 'deleted', department, actor);
  emitToOrg(orgId, 'department:deleted', payload);
}

// Person events
export function emitPersonCreated(orgId: string, person: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'person', 'created', person, actor);
  emitToOrg(orgId, 'person:created', payload);
}

export function emitPersonUpdated(orgId: string, person: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'person', 'updated', person, actor);
  emitToOrg(orgId, 'person:updated', payload);
}

export function emitPersonDeleted(orgId: string, person: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'person', 'deleted', person, actor);
  emitToOrg(orgId, 'person:deleted', payload);
}

// Member events (for sharing)
export function emitMemberAdded(orgId: string, member: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'member', 'added', member, actor);
  emitToOrg(orgId, 'member:added', payload);
}

export function emitMemberUpdated(orgId: string, member: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'member', 'updated', member, actor);
  emitToOrg(orgId, 'member:updated', payload);
}

export function emitMemberRemoved(orgId: string, member: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'member', 'removed', member, actor);
  emitToOrg(orgId, 'member:removed', payload);
}

// Organization events
export function emitOrgUpdated(orgId: string, org: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'org', 'updated', org, actor);
  emitToOrg(orgId, 'org:updated', payload);
}

export function emitOrgSettings(orgId: string, settings: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'org', 'settings', settings, actor);
  emitToOrg(orgId, 'org:settings', payload);
}

export default {
  emitDepartmentCreated,
  emitDepartmentUpdated,
  emitDepartmentDeleted,
  emitPersonCreated,
  emitPersonUpdated,
  emitPersonDeleted,
  emitMemberAdded,
  emitMemberUpdated,
  emitMemberRemoved,
  emitOrgUpdated,
  emitOrgSettings,
};
