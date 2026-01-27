import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as ownershipService from './ownership-transfer.service.js';
import db from '../db.js';
import { checkOrgAccess } from './member.service.js';

// Mock dependencies
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(),
    transaction: vi.fn(cb => cb),
  },
}));

vi.mock('./member.service.js', () => ({
  checkOrgAccess: vi.fn(),
}));

vi.mock('./audit.service.js', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('./email.service.js', () => ({
  sendTransferInitiatedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendTransferAcceptedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendTransferRejectedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendTransferCancelledEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./socket-events.service.js', () => ({
  emitTransferInitiated: vi.fn(),
  emitTransferAccepted: vi.fn(),
  emitTransferRejected: vi.fn(),
  emitTransferCancelled: vi.fn(),
}));

describe('Ownership Transfer Service', () => {
  const mockOrgId = 'org-123';
  const mockOwnerId = 'user-owner';
  const mockMemberId = 'user-member';
  const mockTransferId = 'transfer-123';
  const mockNow = 1672531200; // 2023-01-01 00:00:00 UTC

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(mockNow * 1000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateTransferEligibility', () => {
    it('should return valid for correct inputs', () => {
      // Mock db responses
      (checkOrgAccess as any).mockReturnValue({ role: 'owner', isOwner: true });
      (db.prepare as any).mockReturnValue({
        get: vi.fn().mockImplementation(id => {
          if (id === mockMemberId) return { id: mockMemberId }; // User exists
          if (id === mockOrgId) return undefined; // No pending transfer
          return undefined;
        }),
      });

      const result = ownershipService.validateTransferEligibility(
        mockOrgId,
        mockOwnerId,
        mockMemberId
      );
      expect(result.valid).toBe(true);
    });

    it('should fail if initiator is not owner', () => {
      (checkOrgAccess as any).mockReturnValue({ role: 'admin', isOwner: false });

      const result = ownershipService.validateTransferEligibility(
        mockOrgId,
        mockMemberId,
        mockOwnerId
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only Organization Owners');
    });

    it('should fail if target user does not exist', () => {
      (checkOrgAccess as any).mockReturnValue({ role: 'owner', isOwner: true });
      (db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(undefined), // User not found
      });

      const result = ownershipService.validateTransferEligibility(
        mockOrgId,
        mockOwnerId,
        'non-existent'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Target user not found');
    });
  });

  describe('initiateTransfer', () => {
    it('should create a transfer record', () => {
      // Setup mocks
      (checkOrgAccess as any).mockReturnValue({ role: 'owner', isOwner: true });
      const runMock = vi.fn();
      const getMock = vi.fn();

      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM users')) return { get: () => ({ id: mockMemberId }) };
        if (sql.includes('SELECT id FROM ownership_transfers')) return { get: () => undefined }; // check pending
        if (sql.includes('INSERT INTO ownership_transfers')) return { run: runMock };
        if (sql.includes('INSERT INTO ownership_transfer_audit_log')) return { run: vi.fn() };
        if (sql.includes('SELECT * FROM ownership_transfers'))
          return {
            get: () => ({
              id: mockTransferId,
              organization_id: mockOrgId,
              from_user_id: mockOwnerId,
              to_user_id: mockMemberId,
              status: 'pending',
              initiated_at: mockNow,
              expires_at: mockNow + 7 * 24 * 60 * 60,
              created_at: mockNow,
              updated_at: mockNow,
            }),
          };
        return { get: getMock, run: runMock };
      });

      ownershipService.initiateTransfer(
        mockOrgId,
        mockOwnerId,
        mockMemberId,
        'Valid reason for transfer'
      );

      expect(runMock).toHaveBeenCalledWith(
        expect.any(String), // id
        mockOrgId,
        mockOwnerId,
        mockMemberId,
        'pending',
        mockNow,
        mockNow + 7 * 24 * 60 * 60, // expiresAt
        'Valid reason for transfer',
        mockNow,
        mockNow
      );
    });

    it('should throw error for short reason', () => {
      (checkOrgAccess as any).mockReturnValue({ role: 'owner', isOwner: true });

      // Mock db queries
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM users')) return { get: () => ({ id: mockMemberId }) };
        if (sql.includes('SELECT id FROM ownership_transfers')) return { get: () => undefined }; // No pending transfer
        return { get: () => undefined };
      });

      expect(() => {
        ownershipService.initiateTransfer(mockOrgId, mockOwnerId, mockMemberId, 'Short');
      }).toThrow('Transfer reason must be at least 10 characters');
    });
  });

  describe('acceptTransfer', () => {
    it('should successfully transfer ownership', () => {
      const mockTransfer = {
        id: mockTransferId,
        organization_id: mockOrgId,
        from_user_id: mockOwnerId,
        to_user_id: mockMemberId,
        status: 'pending',
        initiated_at: mockNow,
        expires_at: mockNow + 1000,
        created_at: mockNow,
        updated_at: mockNow,
      };

      const runMock = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM ownership_transfers') && !sql.includes('audit')) {
          return { get: () => mockTransfer };
        }
        return { get: vi.fn(), run: runMock };
      });

      ownershipService.acceptTransfer(mockTransferId, mockMemberId);

      // Verify transaction steps
      // 1. Update org owner
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE organizations'));
      // 2. Remove new owner from members
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM organization_members')
      );
      // 3. Add old owner as admin
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_members')
      );
      // 4. Update transfer status
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ownership_transfers')
      );
      expect(runMock).toHaveBeenCalledWith(mockNow, mockNow, mockTransferId);
    });

    it('should reject acceptance by wrong user', () => {
      const mockTransfer = {
        id: mockTransferId,
        to_user_id: mockMemberId,
        status: 'pending',
      };
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer });

      expect(() => {
        ownershipService.acceptTransfer(mockTransferId, 'wrong-user');
      }).toThrow('Only the designated recipient');
    });

    it('should reject if expired', () => {
      const mockTransfer = {
        id: mockTransferId,
        organization_id: mockOrgId,
        from_user_id: mockOwnerId,
        to_user_id: mockMemberId,
        status: 'pending',
        initiated_at: mockNow,
        expires_at: mockNow - 1000, // Expired
        created_at: mockNow,
        updated_at: mockNow,
      };
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer, run: vi.fn() });

      expect(() => {
        ownershipService.acceptTransfer(mockTransferId, mockMemberId);
      }).toThrow('This transfer has expired');
    });
  });

  describe('rejectTransfer', () => {
    it('should reject transfer', () => {
      const mockTransfer = {
        id: mockTransferId,
        to_user_id: mockMemberId,
        status: 'pending',
      };
      const runMock = vi.fn();
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer, run: runMock });

      ownershipService.rejectTransfer(mockTransferId, mockMemberId, 'Not interested');

      expect(runMock).toHaveBeenCalledWith(mockNow, mockNow, mockTransferId);
      // Status update to rejected
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("status = 'rejected'"));
    });

    it('should fail if not recipient', () => {
      const mockTransfer = {
        id: mockTransferId,
        toUserId: mockMemberId,
        status: 'pending',
      };
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer });

      expect(() => {
        ownershipService.rejectTransfer(mockTransferId, 'wrong-user');
      }).toThrow('Only the designated recipient');
    });
  });

  describe('cancelTransfer', () => {
    it('should cancel transfer by initiator', () => {
      const mockTransfer = {
        id: mockTransferId,
        organization_id: mockOrgId,
        from_user_id: mockOwnerId,
        to_user_id: mockMemberId,
        status: 'pending',
        initiated_at: mockNow,
        expires_at: mockNow + 1000,
        created_at: mockNow,
        updated_at: mockNow,
      };
      // Check permission mock
      (ownershipService as any).isOrgOwner = vi.fn().mockReturnValue(true);
      // Note: isOrgOwner is not exported, so we can't mock it easily if it's internal.
      // But we mock checkOrgAccess which is used by isOrgOwner.
      (checkOrgAccess as any).mockReturnValue({ role: 'owner', isOwner: true });

      const runMock = vi.fn();
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer, run: runMock });

      ownershipService.cancelTransfer(mockTransferId, mockOwnerId, 'Changed mind');

      expect(runMock).toHaveBeenCalledWith('Changed mind', mockNow, mockNow, mockTransferId);
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("status = 'cancelled'"));
    });

    it('should allow Org Owner to cancel even if not initiator', () => {
      const mockTransfer = {
        id: mockTransferId,
        organization_id: mockOrgId,
        from_user_id: 'old-owner-id', // Different initiator
        to_user_id: mockMemberId,
        status: 'pending',
        initiated_at: mockNow,
        expires_at: mockNow + 1000,
        created_at: mockNow,
        updated_at: mockNow,
      };
      // User is Owner of the org
      (checkOrgAccess as any).mockReturnValue({ role: 'owner', isOwner: true });

      const runMock = vi.fn();
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer, run: runMock });

      ownershipService.cancelTransfer(mockTransferId, mockOwnerId, 'Admin override');

      expect(runMock).toHaveBeenCalled();
    });

    it('should fail if not authorized', () => {
      const mockTransfer = {
        id: mockTransferId,
        organization_id: mockOrgId,
        from_user_id: 'other-user',
        to_user_id: mockMemberId,
        status: 'pending',
        initiated_at: mockNow,
        expires_at: mockNow + 1000,
        created_at: mockNow,
        updated_at: mockNow,
      };
      // User is just a member
      (checkOrgAccess as any).mockReturnValue({ role: 'member', isOwner: false });
      (db.prepare as any).mockReturnValue({ get: () => mockTransfer });

      expect(() => {
        ownershipService.cancelTransfer(mockTransferId, mockMemberId, 'Reason');
      }).toThrow('Only the initiator or an Organization Owner');
    });
  });
});
