import { emitToOrg, emitToUser } from '../socket.js';
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
export function emitDepartmentCreated(
  orgId: string,
  department: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'department', 'created', department, actor);
  emitToOrg(orgId, 'department:created', payload);
}

export function emitDepartmentUpdated(
  orgId: string,
  department: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'department', 'updated', department, actor);
  emitToOrg(orgId, 'department:updated', payload);
}

export function emitDepartmentDeleted(
  orgId: string,
  department: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'department', 'deleted', department, actor);
  emitToOrg(orgId, 'department:deleted', payload);
}

// Person events
export function emitPersonCreated(
  orgId: string,
  person: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'person', 'created', person, actor);
  emitToOrg(orgId, 'person:created', payload);
}

export function emitPersonUpdated(
  orgId: string,
  person: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'person', 'updated', person, actor);
  emitToOrg(orgId, 'person:updated', payload);
}

export function emitPersonDeleted(
  orgId: string,
  person: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'person', 'deleted', person, actor);
  emitToOrg(orgId, 'person:deleted', payload);
}

// Member events (for sharing)
export function emitMemberAdded(
  orgId: string,
  member: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'member', 'added', member, actor);
  emitToOrg(orgId, 'member:added', payload);
}

export function emitMemberUpdated(
  orgId: string,
  member: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'member', 'updated', member, actor);
  emitToOrg(orgId, 'member:updated', payload);
}

export function emitMemberRemoved(
  orgId: string,
  member: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'member', 'removed', member, actor);
  emitToOrg(orgId, 'member:removed', payload);
}

// Organization events
export function emitOrgUpdated(orgId: string, org: Record<string, unknown>, actor: Actor): void {
  const payload = createPayload(orgId, 'org', 'updated', org, actor);
  emitToOrg(orgId, 'org:updated', payload);
}

export function emitOrgSettings(
  orgId: string,
  settings: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'org', 'settings', settings, actor);
  emitToOrg(orgId, 'org:settings', payload);
}

// Custom Field events
export function emitCustomFieldCreated(
  orgId: string,
  field: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'custom_field', 'created', field, actor);
  emitToOrg(orgId, 'custom_field:created', payload);
}

export function emitCustomFieldUpdated(
  orgId: string,
  field: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'custom_field', 'updated', field, actor);
  emitToOrg(orgId, 'custom_field:updated', payload);
}

export function emitCustomFieldDeleted(
  orgId: string,
  field: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'custom_field', 'deleted', field, actor);
  emitToOrg(orgId, 'custom_field:deleted', payload);
}

export function emitCustomFieldsReordered(
  orgId: string,
  data: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'custom_field', 'reordered', data, actor);
  emitToOrg(orgId, 'custom_field:reordered', payload);
}

// Ownership Transfer events
export function emitTransferInitiated(
  orgId: string,
  toUserId: string,
  data: Record<string, unknown>,
  actor: Actor
): void {
  // Notify recipient privately
  const payload = createPayload(orgId, 'ownership_transfer', 'initiated', data, actor);
  emitToUser(toUserId, 'ownership_transfer:initiated', payload);

  // Also notify admins of the org (so they know a transfer is pending)
  emitToOrg(orgId, 'ownership_transfer:initiated', payload);
}

export function emitTransferAccepted(
  orgId: string,
  fromUserId: string,
  data: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'ownership_transfer', 'accepted', data, actor);

  // Notify old owner privately
  emitToUser(fromUserId, 'ownership_transfer:accepted', payload);

  // Notify whole org of ownership change
  emitToOrg(orgId, 'ownership_transfer:accepted', payload);
  emitToOrg(orgId, 'org:updated', { ...data, createdById: actor.id }); // Implicit update of org owner
}

export function emitTransferRejected(
  orgId: string,
  fromUserId: string,
  data: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'ownership_transfer', 'rejected', data, actor);

  // Notify initiator privately
  emitToUser(fromUserId, 'ownership_transfer:rejected', payload);

  // Notify admins (optional, but good for visibility)
  emitToOrg(orgId, 'ownership_transfer:rejected', payload);
}

export function emitTransferCancelled(
  orgId: string,
  toUserId: string,
  data: Record<string, unknown>,
  actor: Actor
): void {
  const payload = createPayload(orgId, 'ownership_transfer', 'cancelled', data, actor);

  // Notify recipient
  emitToUser(toUserId, 'ownership_transfer:cancelled', payload);

  // Notify admins
  emitToOrg(orgId, 'ownership_transfer:cancelled', payload);
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
  emitCustomFieldCreated,
  emitCustomFieldUpdated,
  emitCustomFieldDeleted,
  emitCustomFieldsReordered,
  emitTransferInitiated,
  emitTransferAccepted,
  emitTransferRejected,
  emitTransferCancelled,
};
