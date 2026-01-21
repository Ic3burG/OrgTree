import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as auditService from './audit.service.js';
import db from '../db.js';

// Mock database
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      run: vi.fn(),
      all: vi.fn(),
    })),
  },
}));

describe('Audit Service', () => {
  const mockNow = new Date('2024-01-01T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    // Default db mock behavior
    vi.mocked(db.prepare).mockReturnValue({
      run: vi.fn().mockReturnValue({ changes: 1 }),
      all: vi.fn().mockReturnValue([]),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', () => {
      const actor = { id: 'user-1', name: 'User 1' };
      const entityData = { foo: 'bar' };

      const result = auditService.createAuditLog(
        'org-1',
        actor,
        'created',
        'person',
        'p1',
        entityData
      );

      expect(result).toHaveProperty('id');
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs')
      );
      
      const mockRun = vi.mocked(db.prepare('sql').run);
      // Verify args passed to run (id, orgId, actorId, actorName, actionType, entityType, entityId, entityDataJson)
      // Since we don't capture the exact statement object for the specific call easily without more complex mocking,
      // generally checking db.prepare was called is a good start, but let's be more specific if possible.
      // Ideally we'd capture the mock returned by nested call. Use:
      // expect(vi.mocked(db.prepare)().run).toHaveBeenCalledWith(...) // This is tricky if prepare called multiple times.
    });

    it('should handle errors gracefully', () => {
      vi.mocked(db.prepare).mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = auditService.createAuditLog('org-1', null, 'created', 'person', null, null);
      
      expect(result).toBeNull();
      // Should log error but not throw
    });
  });

  describe('getAuditLogs', () => {
    it('should fetch logs with default options', () => {
      const mockLogs = [
        {
          id: '1',
          organizationId: 'org-1',
          actorId: 'u1',
          actorName: 'User 1',
          actionType: 'created',
          entityType: 'person',
          entityId: 'p1',
          entityData: '{"name":"Test"}',
          createdAt: mockNow.toISOString(),
        },
      ];

      vi.mocked(db.prepare).mockReturnValue({
        all: vi.fn().mockReturnValue(mockLogs),
      } as any);

      const result = auditService.getAuditLogs('org-1');

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].entityData).toEqual({ name: 'Test' });
      expect(result.hasMore).toBe(false);
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE organization_id = ?'));
    });

    it('should parse filters correctly', () => {
      auditService.getAuditLogs('org-1', {
        actionType: 'deleted',
        entityType: 'department',
        startDate: '2024-01-01',
      });

      // Check that SQL contains filter conditions
      // This implicitly tests logic by checking if params would be constructed (which depends on conditions)
      // but verifying exact SQL string is fragile. 
      // Instead, we can verify that db.prepare was called and we can infer conditions.
      const call = vi.mocked(db.prepare).mock.calls[0][0] as string;
      expect(call).toContain('action_type = ?');
      expect(call).toContain('entity_type = ?');
      expect(call).toContain('created_at >= ?');
    });

    it('should handle pagination cursor', () => {
      const cursor = '2024-01-01:123';
      auditService.getAuditLogs('org-1', { cursor });

      const call = vi.mocked(db.prepare).mock.calls[0][0] as string;
      expect(call).toContain('(created_at < ? OR (created_at = ? AND id < ?))');
    });

    it('should indicate hasMore if limit exceeded', () => {
      const mockLogs = Array(51).fill({ id: 'x' }); // Default limit 50 + 1
      vi.mocked(db.prepare).mockReturnValue({
        all: vi.fn().mockReturnValue(mockLogs),
      } as any);

      const result = auditService.getAuditLogs('org-1', { limit: 50 });
      
      expect(result.logs).toHaveLength(50);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getAllAuditLogs', () => {
    it('should fetch logs across organizations', () => {
      const mockLogs = [
        {
          id: '1',
          organizationId: 'org-1',
          organizationName: 'Org 1',
          actionType: 'created',
          createdAt: mockNow.toISOString(),
        }
      ];

      vi.mocked(db.prepare).mockReturnValue({
        all: vi.fn().mockReturnValue(mockLogs),
      } as any);

      const result = auditService.getAllAuditLogs({ orgId: 'org-1' });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].organizationName).toBe('Org 1');
      
      const call = vi.mocked(db.prepare).mock.calls[0][0] as string;
      expect(call).toContain('LEFT JOIN organizations o');
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs', () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 100 });
      vi.mocked(db.prepare).mockReturnValue({
        run: mockRun,
      } as any);

      const count = auditService.cleanupOldLogs();

      expect(count).toBe(100);
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("date('now', '-1 year')")
      );
    });

    it('should handle database errors', () => {
      vi.mocked(db.prepare).mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const count = auditService.cleanupOldLogs();
      expect(count).toBe(0);
    });
  });
});
