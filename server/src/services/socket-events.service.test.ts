import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as socketEvents from './socket-events.service.js';
import { emitToOrg } from '../socket.js';
import { createAuditLog } from './audit.service.js';

// Mock dependencies
vi.mock('../socket.js', () => ({
  emitToOrg: vi.fn(),
}));

vi.mock('./audit.service.js', () => ({
  createAuditLog: vi.fn(),
}));

describe('Socket Events Service', () => {
  const mockActor = { id: 'u1', name: 'User 1', email: 'u1@example.com' };
  const mockOrgId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Department Events', () => {
    it('should emit department created event and log audit', () => {
      const dept = { id: 'd1', name: 'Dept 1' };
      socketEvents.emitDepartmentCreated(mockOrgId, dept, mockActor);

      expect(createAuditLog).toHaveBeenCalledWith(
        mockOrgId,
        mockActor,
        'created',
        'department',
        'd1',
        dept
      );

      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'department:created',
        expect.objectContaining({
          type: 'department',
          action: 'created',
          data: dept,
          meta: expect.objectContaining({
            actorId: 'u1',
            actorName: 'User 1',
          }),
        })
      );
    });

    it('should emit department updated event', () => {
      const dept = { id: 'd1', name: 'Dept 1 Updated' };
      socketEvents.emitDepartmentUpdated(mockOrgId, dept, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'department:updated',
        expect.objectContaining({ action: 'updated', data: dept })
      );
    });

    it('should emit department deleted event', () => {
      const dept = { id: 'd1' };
      socketEvents.emitDepartmentDeleted(mockOrgId, dept, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'department:deleted',
        expect.objectContaining({ action: 'deleted', data: dept })
      );
    });
  });

  describe('Person Events', () => {
    it('should emit person created event', () => {
      const person = { id: 'p1', name: 'Person 1' };
      socketEvents.emitPersonCreated(mockOrgId, person, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'person:created',
        expect.objectContaining({ type: 'person', action: 'created', data: person })
      );
    });

    it('should emit person updated event', () => {
      const person = { id: 'p1', name: 'Person 1' };
      socketEvents.emitPersonUpdated(mockOrgId, person, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'person:updated',
        expect.objectContaining({ type: 'person', action: 'updated' })
      );
    });

    it('should emit person deleted event', () => {
      const person = { id: 'p1' };
      socketEvents.emitPersonDeleted(mockOrgId, person, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'person:deleted',
        expect.objectContaining({ type: 'person', action: 'deleted' })
      );
    });
  });

  describe('Member Events', () => {
    it('should emit member added event', () => {
      const member = { id: 'm1', userId: 'u2' };
      socketEvents.emitMemberAdded(mockOrgId, member, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'member:added',
        expect.objectContaining({ type: 'member', action: 'added' })
      );
    });

    it('should emit member updated event', () => {
      const member = { id: 'm1', role: 'admin' };
      socketEvents.emitMemberUpdated(mockOrgId, member, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'member:updated',
        expect.objectContaining({ type: 'member', action: 'updated' })
      );
    });

    it('should emit member removed event', () => {
      const member = { id: 'm1' };
      socketEvents.emitMemberRemoved(mockOrgId, member, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'member:removed',
        expect.objectContaining({ type: 'member', action: 'removed' })
      );
    });
  });

  describe('Organization Events', () => {
    it('should emit org updated event', () => {
      const org = { id: 'o1', name: 'New Name' };
      socketEvents.emitOrgUpdated(mockOrgId, org, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'org:updated',
        expect.objectContaining({ type: 'org', action: 'updated' })
      );
    });

    it('should emit org settings event', () => {
      const settings = { theme: 'dark' };
      socketEvents.emitOrgSettings(mockOrgId, settings, mockActor);
      
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'org:settings',
        expect.objectContaining({ type: 'org', action: 'settings' })
      );
    });
  });

  describe('Custom Field Events', () => {
    it('should emit custom field created', () => {
      const field = { id: 'cf1', name: 'Field 1' };
      socketEvents.emitCustomFieldCreated(mockOrgId, field, mockActor);
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'custom_field:created',
        expect.objectContaining({ type: 'custom_field', action: 'created' })
      );
    });

    it('should emit custom field updated', () => {
      const field = { id: 'cf1', name: 'Field 1' };
      socketEvents.emitCustomFieldUpdated(mockOrgId, field, mockActor);
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'custom_field:updated',
        expect.objectContaining({ type: 'custom_field', action: 'updated' })
      );
    });

    it('should emit custom field deleted', () => {
      const field = { id: 'cf1' };
      socketEvents.emitCustomFieldDeleted(mockOrgId, field, mockActor);
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'custom_field:deleted',
        expect.objectContaining({ type: 'custom_field', action: 'deleted' })
      );
    });

    it('should emit custom fields reordered', () => {
      const data = { fields: [] };
      socketEvents.emitCustomFieldsReordered(mockOrgId, data, mockActor);
      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'custom_field:reordered',
        expect.objectContaining({ type: 'custom_field', action: 'reordered' })
      );
    });
  });

  it('should handle missing actor', () => {
      const dept = { id: 'd1' };
      socketEvents.emitDepartmentCreated(mockOrgId, dept, null as any);

      expect(emitToOrg).toHaveBeenCalledWith(
        mockOrgId,
        'department:created',
        expect.objectContaining({
          meta: expect.objectContaining({
            actorId: null,
            actorName: 'System',
          }),
        })
      );
  });
});
