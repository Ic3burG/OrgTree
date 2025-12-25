import { emitToOrg } from '../socket.js';

/**
 * Creates a standardized event payload
 * @param {string} type - Entity type (person, department, member, org)
 * @param {string} action - Action type (created, updated, deleted)
 * @param {Object} data - Entity data
 * @param {Object} actor - User who performed the action
 * @returns {Object} Standardized event payload
 */
function createPayload(type, action, data, actor) {
  return {
    type,
    action,
    data,
    meta: {
      actorId: actor?.id || null,
      actorName: actor?.name || 'System',
      timestamp: new Date().toISOString()
    }
  };
}

// Department events
export function emitDepartmentCreated(orgId, department, actor) {
  const payload = createPayload('department', 'created', department, actor);
  emitToOrg(orgId, 'department:created', payload);
}

export function emitDepartmentUpdated(orgId, department, actor) {
  const payload = createPayload('department', 'updated', department, actor);
  emitToOrg(orgId, 'department:updated', payload);
}

export function emitDepartmentDeleted(orgId, departmentId, actor) {
  const payload = createPayload('department', 'deleted', { id: departmentId }, actor);
  emitToOrg(orgId, 'department:deleted', payload);
}

// Person events
export function emitPersonCreated(orgId, person, actor) {
  const payload = createPayload('person', 'created', person, actor);
  emitToOrg(orgId, 'person:created', payload);
}

export function emitPersonUpdated(orgId, person, actor) {
  const payload = createPayload('person', 'updated', person, actor);
  emitToOrg(orgId, 'person:updated', payload);
}

export function emitPersonDeleted(orgId, personId, actor) {
  const payload = createPayload('person', 'deleted', { id: personId }, actor);
  emitToOrg(orgId, 'person:deleted', payload);
}

// Member events (for sharing)
export function emitMemberAdded(orgId, member, actor) {
  const payload = createPayload('member', 'added', member, actor);
  emitToOrg(orgId, 'member:added', payload);
}

export function emitMemberUpdated(orgId, member, actor) {
  const payload = createPayload('member', 'updated', member, actor);
  emitToOrg(orgId, 'member:updated', payload);
}

export function emitMemberRemoved(orgId, memberId, actor) {
  const payload = createPayload('member', 'removed', { id: memberId }, actor);
  emitToOrg(orgId, 'member:removed', payload);
}

// Organization events
export function emitOrgUpdated(orgId, org, actor) {
  const payload = createPayload('org', 'updated', org, actor);
  emitToOrg(orgId, 'org:updated', payload);
}

export function emitOrgSettings(orgId, settings, actor) {
  const payload = createPayload('org', 'settings', settings, actor);
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
  emitOrgSettings
};
