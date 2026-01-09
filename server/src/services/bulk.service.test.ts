import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bulkService from './bulk.service.js';
import * as memberService from './member.service.js';
import * as socketEventsService from './socket-events.service.js';
import db from '../db.js';

// Mock dependencies
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(),
    transaction: vi.fn(),
  },
}));
vi.mock('./member.service.js');
vi.mock('./socket-events.service.js');

describe('Bulk Operations Service', () => {
  const mockActor = { id: 'user-1', name: 'Test User' };
  const mockOrgId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for permission check
    vi.mocked(memberService.requireOrgPermission).mockReturnValue(undefined);

    // Default mock for socket events
    vi.mocked(socketEventsService.emitPersonDeleted).mockReturnValue(undefined);
    vi.mocked(socketEventsService.emitPersonUpdated).mockReturnValue(undefined);
    vi.mocked(socketEventsService.emitDepartmentDeleted).mockReturnValue(undefined);
    vi.mocked(socketEventsService.emitDepartmentUpdated).mockReturnValue(undefined);
  });

  describe('bulkDeletePeople', () => {
    it('should successfully delete multiple people', () => {
      const personIds = ['person-1', 'person-2'];
      const mockPeople = [
        {
          id: 'person-1',
          name: 'John Doe',
          title: 'Manager',
          email: 'john@example.com',
          phone: '123-456-7890',
          departmentId: 'dept-1',
          organization_id: mockOrgId,
          departmentName: 'Engineering',
        },
        {
          id: 'person-2',
          name: 'Jane Smith',
          title: 'Developer',
          email: 'jane@example.com',
          phone: '098-765-4321',
          departmentId: 'dept-1',
          organization_id: mockOrgId,
          departmentName: 'Engineering',
        },
      ];

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT p.id, p.name')) {
          return {
            get: vi.fn((id: string) => {
              return mockPeople.find(p => p.id === id);
            }),
          } as never;
        }
        if (query.includes('UPDATE people SET deleted_at')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkDeletePeople(mockOrgId, personIds, mockActor);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.deleted).toHaveLength(2);
      expect(socketEventsService.emitPersonDeleted).toHaveBeenCalledTimes(2);
      expect(memberService.requireOrgPermission).toHaveBeenCalledWith(
        mockOrgId,
        mockActor.id,
        'editor'
      );
    });

    it('should handle partial failures', () => {
      const personIds = ['person-1', 'nonexistent'];

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT p.id, p.name')) {
          return {
            get: vi.fn((id: string) => {
              if (id === 'person-1') {
                return {
                  id: 'person-1',
                  name: 'John Doe',
                  departmentId: 'dept-1',
                  organization_id: mockOrgId,
                  departmentName: 'Engineering',
                };
              }
              return undefined;
            }),
          } as never;
        }
        if (query.includes('UPDATE people SET deleted_at')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkDeletePeople(mockOrgId, personIds, mockActor);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failed[0]).toEqual({
        id: 'nonexistent',
        error: 'Person not found in this organization',
      });
    });

    it('should reject empty person IDs array', () => {
      try {
        bulkService.bulkDeletePeople(mockOrgId, [], mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('personIds must be a non-empty array');
      }
    });

    it('should reject more than 100 items', () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => `person-${i}`);

      try {
        bulkService.bulkDeletePeople(mockOrgId, tooMany, mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('Cannot delete more than 100 items at once');
      }
    });

    it('should check organization permissions', () => {
      vi.mocked(memberService.requireOrgPermission).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      try {
        bulkService.bulkDeletePeople(mockOrgId, ['person-1'], mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as Error).message).toBe('Permission denied');
      }
    });
  });

  describe('bulkMovePeople', () => {
    it('should successfully move multiple people to target department', () => {
      const personIds = ['person-1', 'person-2'];
      const targetDeptId = 'dept-2';

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments')) {
          return {
            get: vi.fn(() => ({ id: targetDeptId, name: 'HR' })),
          } as never;
        }
        if (query.includes('SELECT p.id, p.name')) {
          return {
            get: vi.fn((id: string) => ({
              id,
              name: `Person ${id}`,
              departmentId: 'dept-1',
              organization_id: mockOrgId,
              departmentName: 'Engineering',
            })),
          } as never;
        }
        if (query.includes('UPDATE people SET department_id')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkMovePeople(mockOrgId, personIds, targetDeptId, mockActor);

      expect(result.success).toBe(true);
      expect(result.movedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.moved).toHaveLength(2);
      expect(result.moved[0].departmentName).toBe('HR');
      expect(socketEventsService.emitPersonUpdated).toHaveBeenCalledTimes(2);
    });

    it('should reject if target department not found', () => {
      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments')) {
          return {
            get: vi.fn(() => undefined),
          } as never;
        }
        return {} as never;
      });

      try {
        bulkService.bulkMovePeople(mockOrgId, ['person-1'], 'nonexistent-dept', mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(404);
        expect((error as Error).message).toBe('Target department not found in this organization');
      }
    });

    it('should skip people already in target department', () => {
      const personIds = ['person-1'];
      const targetDeptId = 'dept-1';

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments')) {
          return {
            get: vi.fn(() => ({ id: targetDeptId, name: 'Engineering' })),
          } as never;
        }
        if (query.includes('SELECT p.id, p.name')) {
          return {
            get: vi.fn(() => ({
              id: 'person-1',
              name: 'John Doe',
              departmentId: 'dept-1', // Already in target dept
              organization_id: mockOrgId,
              departmentName: 'Engineering',
            })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkMovePeople(mockOrgId, personIds, targetDeptId, mockActor);

      expect(result.success).toBe(false);
      expect(result.movedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Already in target department');
    });

    it('should reject missing target department ID', () => {
      try {
        bulkService.bulkMovePeople(mockOrgId, ['person-1'], '', mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('targetDepartmentId is required');
      }
    });
  });

  describe('bulkEditPeople', () => {
    it('should successfully update title for multiple people', () => {
      const personIds = ['person-1', 'person-2'];
      const updates = { title: 'Senior Developer' };

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT p.id, p.name')) {
          return {
            get: vi.fn((id: string) => ({
              id,
              name: `Person ${id}`,
              title: 'Developer',
              departmentId: 'dept-1',
              organization_id: mockOrgId,
              departmentName: 'Engineering',
            })),
          } as never;
        }
        if (query.includes('UPDATE people SET')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkEditPeople(mockOrgId, personIds, updates, mockActor);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.updated[0].title).toBe('Senior Developer');
    });

    it('should update both title and department', () => {
      const personIds = ['person-1'];
      const updates = { title: 'Manager', departmentId: 'dept-2' };

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments')) {
          return {
            get: vi.fn(() => ({ id: 'dept-2', name: 'HR' })),
          } as never;
        }
        if (query.includes('SELECT p.id, p.name')) {
          return {
            get: vi.fn(() => ({
              id: 'person-1',
              name: 'John Doe',
              title: 'Developer',
              departmentId: 'dept-1',
              organization_id: mockOrgId,
              departmentName: 'Engineering',
            })),
          } as never;
        }
        if (query.includes('UPDATE people SET')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkEditPeople(mockOrgId, personIds, updates, mockActor);

      expect(result.success).toBe(true);
      expect(result.updated[0].title).toBe('Manager');
      expect(result.updated[0].departmentId).toBe('dept-2');
      expect(result.updated[0].departmentName).toBe('HR');
    });

    it('should reject empty updates object', () => {
      try {
        bulkService.bulkEditPeople(mockOrgId, ['person-1'], {}, mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('updates object is required and cannot be empty');
      }
    });

    it('should reject if target department not found', () => {
      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments')) {
          return {
            get: vi.fn(() => undefined),
          } as never;
        }
        return {} as never;
      });

      try {
        bulkService.bulkEditPeople(
          mockOrgId,
          ['person-1'],
          { departmentId: 'nonexistent' },
          mockActor
        );
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(404);
        expect((error as Error).message).toBe('Target department not found in this organization');
      }
    });
  });

  describe('bulkDeleteDepartments', () => {
    it('should reject empty department IDs array', () => {
      try {
        bulkService.bulkDeleteDepartments(mockOrgId, [], mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('departmentIds must be a non-empty array');
      }
    });

    it('should reject more than 100 items', () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => `dept-${i}`);

      try {
        bulkService.bulkDeleteDepartments(mockOrgId, tooMany, mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('Cannot delete more than 100 items at once');
      }
    });

    it('should check organization permissions', () => {
      vi.mocked(memberService.requireOrgPermission).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      try {
        bulkService.bulkDeleteDepartments(mockOrgId, ['dept-1'], mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as Error).message).toBe('Permission denied');
      }
    });
  });

  describe('bulkEditDepartments', () => {
    it('should successfully re-parent multiple departments', () => {
      const deptIds = ['dept-2', 'dept-3'];
      const updates = { parentId: 'dept-1' };

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments WHERE id = ?')) {
          return {
            get: vi.fn(() => ({ id: 'dept-1', name: 'Engineering' })),
          } as never;
        }
        if (query.includes('SELECT id, name, description, parent_id')) {
          return {
            get: vi.fn((id: string) => ({
              id,
              name: `Department ${id}`,
              organization_id: mockOrgId,
              parentId: null,
            })),
          } as never;
        }
        if (query.includes('SELECT parent_id FROM departments')) {
          return {
            get: vi.fn(() => undefined),
          } as never;
        }
        if (query.includes('UPDATE departments SET parent_id')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkEditDepartments(mockOrgId, deptIds, updates, mockActor);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.updated[0].parentId).toBe('dept-1');
    });

    it('should reject circular reference - self as parent', () => {
      const deptIds = ['dept-1'];
      const updates = { parentId: 'dept-1' };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments WHERE id = ?')) {
          return {
            get: vi.fn(() => ({ id: 'dept-1', name: 'Engineering' })),
          } as never;
        }
        return {} as never;
      });

      try {
        bulkService.bulkEditDepartments(mockOrgId, deptIds, updates, mockActor);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
        expect((error as Error).message).toBe('Cannot set a department as its own parent');
      }
    });

    it('should reject parent department not found', () => {
      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments WHERE id = ?')) {
          return {
            get: vi.fn(() => undefined),
          } as never;
        }
        return {} as never;
      });

      try {
        bulkService.bulkEditDepartments(
          mockOrgId,
          ['dept-1'],
          { parentId: 'nonexistent' },
          mockActor
        );
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(404);
        expect((error as Error).message).toBe('Parent department not found in this organization');
      }
    });

    it('should handle setting parent to null (make root department)', () => {
      const deptIds = ['dept-2'];
      const updates = { parentId: null };

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name, description, parent_id')) {
          return {
            get: vi.fn(() => ({
              id: 'dept-2',
              name: 'HR',
              organization_id: mockOrgId,
              parentId: 'dept-1',
            })),
          } as never;
        }
        if (query.includes('UPDATE departments SET parent_id')) {
          return {
            run: vi.fn(() => ({ changes: 1 })),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkEditDepartments(mockOrgId, deptIds, updates, mockActor);

      expect(result.success).toBe(true);
      expect(result.updated[0].parentId).toBe(null);
    });

    it('should prevent descendant from becoming parent', () => {
      const deptIds = ['dept-1']; // dept-1 wants dept-2 as parent
      const updates = { parentId: 'dept-2' };

      vi.mocked(db.transaction).mockImplementation((fn: () => void) => {
        return fn;
      });

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id, name FROM departments WHERE id = ?')) {
          return {
            get: vi.fn(() => ({ id: 'dept-2', name: 'HR' })),
          } as never;
        }
        if (query.includes('SELECT id, name, description, parent_id')) {
          return {
            get: vi.fn(() => ({
              id: 'dept-1',
              name: 'Engineering',
              organization_id: mockOrgId,
              parentId: null,
            })),
          } as never;
        }
        // Make dept-2 a child of dept-1 (dept-2 -> dept-1)
        if (query.includes('SELECT parent_id FROM departments WHERE id')) {
          return {
            get: vi.fn((id: string) => {
              if (id === 'dept-2') {
                return { parent_id: 'dept-1' }; // dept-2's parent is dept-1
              }
              return undefined;
            }),
          } as never;
        }
        return {} as never;
      });

      const result = bulkService.bulkEditDepartments(mockOrgId, deptIds, updates, mockActor);

      // Should fail because dept-2 is a descendant of dept-1
      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.failed[0].error).toBe('Cannot set parent to a descendant department');
    });
  });
});
