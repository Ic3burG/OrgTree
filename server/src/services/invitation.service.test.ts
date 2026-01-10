import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as invitationService from './invitation.service.js';
import * as memberService from './member.service.js';
import * as emailService from './email.service.js';
import db from '../db.js';

// Mock dependencies
vi.mock('./member.service.js', () => ({
  requireOrgPermission: vi.fn(),
}));

vi.mock('./email.service.js', () => ({
  sendInvitationEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));

vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(),
  },
}));

describe('Invitation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInvitation', () => {
    it('should create invitation and send email successfully', async () => {
      // Mock permission check (should not throw)
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      // Mock database queries - handle different queries
      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM users WHERE email')) {
          // User doesn't exist
          return { get: vi.fn(() => undefined), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('SELECT id FROM invitations') && sql.includes('pending')) {
          // No pending invitation
          return { get: vi.fn(() => undefined), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes("SELECT name FROM users WHERE id = '?'")) {
          // Get inviter name
          return {
            get: vi.fn(() => ({ name: 'John Inviter' })),
            run: vi.fn(),
            all: vi.fn(),
          } as never;
        }
        if (sql.includes("SELECT name FROM organizations WHERE id = '?'")) {
          // Get org name
          return { get: vi.fn(() => ({ name: 'Test Org' })), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('INSERT INTO invitations')) {
          // Insert invitation
          return { run: vi.fn(() => ({ changes: 1 })), get: vi.fn(), all: vi.fn() } as never;
        }
        // Default fallback
        return { get: vi.fn(), run: vi.fn(), all: vi.fn() } as never;
      });

      // Mock email service
      vi.mocked(emailService.sendInvitationEmail).mockResolvedValue({ success: true });

      const result = await invitationService.createInvitation(
        'org-123',
        'test@example.com',
        'editor',
        'inviter-123'
      );

      expect(result).toMatchObject({
        email: 'test@example.com',
        role: 'editor',
        status: 'pending',
        emailSent: true,
      });
      expect(result.id).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(memberService.requireOrgPermission).toHaveBeenCalledWith(
        'org-123',
        'inviter-123',
        'admin'
      );
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it('should throw error for invalid role', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      await expect(
        invitationService.createInvitation(
          'org-123',
          'test@example.com',
          'superadmin',
          'inviter-123'
        )
      ).rejects.toThrow('Invalid role. Must be: viewer, editor, or admin');
    });

    it('should throw error if user is already organization owner', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn((emailOrId?: string) => {
          // User exists
          if (emailOrId === 'owner@example.com') return { id: 'user-123' };
          // Org owner check
          if (emailOrId === 'org-123') return { created_by_id: 'user-123' };
          return undefined;
        }),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      await expect(
        invitationService.createInvitation('org-123', 'owner@example.com', 'editor', 'inviter-123')
      ).rejects.toThrow('Cannot send invitation to this email address');
    });

    it('should throw error if user is already a member', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          // First call: user exists
          if (callCount === 1) return { id: 'user-123' };
          // Second call: org owner check (not owner)
          if (callCount === 2) return { created_by_id: 'other-user' };
          // Third call: already a member
          if (callCount === 3) return { id: 'member-123' };
          return undefined;
        }),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      await expect(
        invitationService.createInvitation('org-123', 'member@example.com', 'editor', 'inviter-123')
      ).rejects.toThrow('Cannot send invitation to this email address');
    });

    it('should throw error if pending invitation already exists', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          // First call: user doesn't exist
          if (callCount === 1) return undefined;
          // Second call: pending invitation exists
          if (callCount === 2) return { id: 'invitation-123' };
          return undefined;
        }),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      await expect(
        invitationService.createInvitation('org-123', 'test@example.com', 'editor', 'inviter-123')
      ).rejects.toThrow('An invitation has already been sent to this email');
    });

    it('should normalize email to lowercase and trim', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM users WHERE email')) {
          return { get: vi.fn(() => undefined), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('SELECT id FROM invitations') && sql.includes('pending')) {
          return { get: vi.fn(() => undefined), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('SELECT name FROM users')) {
          return {
            get: vi.fn(() => ({ name: 'John Inviter' })),
            run: vi.fn(),
            all: vi.fn(),
          } as never;
        }
        if (sql.includes('SELECT name FROM organizations')) {
          return { get: vi.fn(() => ({ name: 'Test Org' })), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('INSERT INTO invitations')) {
          return { run: vi.fn(() => ({ changes: 1 })), get: vi.fn(), all: vi.fn() } as never;
        }
        return { get: vi.fn(), run: vi.fn(), all: vi.fn() } as never;
      });

      vi.mocked(emailService.sendInvitationEmail).mockResolvedValue({ success: true });

      const result = await invitationService.createInvitation(
        'org-123',
        '  TEST@EXAMPLE.COM  ',
        'viewer',
        'inviter-123'
      );

      expect(result.email).toBe('test@example.com');
    });

    it('should return email error if email sending fails', async () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM users WHERE email')) {
          return { get: vi.fn(() => undefined), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('SELECT id FROM invitations') && sql.includes('pending')) {
          return { get: vi.fn(() => undefined), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('SELECT name FROM users')) {
          return {
            get: vi.fn(() => ({ name: 'John Inviter' })),
            run: vi.fn(),
            all: vi.fn(),
          } as never;
        }
        if (sql.includes('SELECT name FROM organizations')) {
          return { get: vi.fn(() => ({ name: 'Test Org' })), run: vi.fn(), all: vi.fn() } as never;
        }
        if (sql.includes('INSERT INTO invitations')) {
          return { run: vi.fn(() => ({ changes: 1 })), get: vi.fn(), all: vi.fn() } as never;
        }
        return { get: vi.fn(), run: vi.fn(), all: vi.fn() } as never;
      });

      vi.mocked(emailService.sendInvitationEmail).mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
      });

      const result = await invitationService.createInvitation(
        'org-123',
        'test@example.com',
        'viewer',
        'inviter-123'
      );

      expect(result.emailSent).toBe(false);
      expect(result.emailError).toBe('SMTP connection failed');
    });
  });

  describe('getOrgInvitations', () => {
    it('should return pending invitations for organization', () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          role: 'editor',
          status: 'pending',
          expiresAt: '2026-01-15T00:00:00Z',
          createdAt: '2026-01-08T00:00:00Z',
          invitedByName: 'Admin User',
        },
        {
          id: 'inv-2',
          email: 'user2@example.com',
          role: 'viewer',
          status: 'pending',
          expiresAt: '2026-01-16T00:00:00Z',
          createdAt: '2026-01-09T00:00:00Z',
          invitedByName: 'Admin User',
        },
      ];

      vi.mocked(db.prepare).mockReturnValue({
        all: vi.fn(() => mockInvitations),
        get: vi.fn(),
        run: vi.fn(),
      } as any);

      const result = invitationService.getOrgInvitations('org-123', 'admin-123');

      expect(result).toEqual(mockInvitations);
      expect(memberService.requireOrgPermission).toHaveBeenCalledWith(
        'org-123',
        'admin-123',
        'admin'
      );
    });

    it('should return empty array when no pending invitations', () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      vi.mocked(db.prepare).mockReturnValue({
        all: vi.fn(() => []),
        get: vi.fn(),
        run: vi.fn(),
      } as any);

      const result = invitationService.getOrgInvitations('org-123', 'admin-123');

      expect(result).toEqual([]);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => ({ id: 'inv-123' })),
        run: vi.fn(() => ({ changes: 1 })),
        all: vi.fn(),
      } as any);

      const result = invitationService.cancelInvitation('org-123', 'inv-123', 'admin-123');

      expect(result).toEqual({ success: true });
      expect(memberService.requireOrgPermission).toHaveBeenCalledWith(
        'org-123',
        'admin-123',
        'admin'
      );
    });

    it('should throw 404 error when invitation not found', () => {
      vi.mocked(memberService.requireOrgPermission).mockReturnValue({
        hasAccess: true,
        role: 'admin',
        isOwner: true,
      });

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => undefined),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      expect(() => invitationService.cancelInvitation('org-123', 'inv-999', 'admin-123')).toThrow(
        'Invitation not found'
      );
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation details for valid token', () => {
      const mockInvitation = {
        id: 'inv-123',
        organizationId: 'org-123',
        role: 'editor',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        organizationName: 'Test Organization',
      };

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => mockInvitation),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      const result = invitationService.getInvitationByToken('valid-token-123');

      expect(result).toEqual({
        organizationName: 'Test Organization',
        role: 'editor',
        status: 'pending',
        expiresAt: mockInvitation.expiresAt,
      });
    });

    it('should return null for invalid token', () => {
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => undefined),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      const result = invitationService.getInvitationByToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return expired status for expired invitation', () => {
      const mockInvitation = {
        id: 'inv-123',
        organizationId: 'org-123',
        role: 'editor',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        organizationName: 'Test Organization',
      };

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => mockInvitation),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      const result = invitationService.getInvitationByToken('expired-token');

      expect(result).toEqual({
        organizationName: 'Test Organization',
        role: 'editor',
        status: 'expired',
        expiresAt: mockInvitation.expiresAt,
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and add user as member', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'user@example.com',
        role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: 'inviter-123',
      };

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          // First call: get invitation
          if (callCount === 1) return mockInvitation;
          // Second call: get user email
          if (callCount === 2) return { email: 'user@example.com' };
          // Third call: check existing member (not a member)
          if (callCount === 3) return undefined;
          // Fourth call: check if user is owner (not owner)
          if (callCount === 4) return { created_by_id: 'other-user' };
          return undefined;
        }),
        run: vi.fn(() => ({ changes: 1 })),
        all: vi.fn(),
      } as any);

      const result = invitationService.acceptInvitation('valid-token', 'user-123');

      expect(result).toEqual({
        success: true,
        organizationId: 'org-123',
        role: 'editor',
      });
    });

    it('should throw 404 error when invitation not found', () => {
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => undefined),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      expect(() => invitationService.acceptInvitation('invalid-token', 'user-123')).toThrow(
        'Invitation not found'
      );
    });

    it('should throw error when invitation is not pending', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'user@example.com',
        role: 'editor',
        status: 'accepted',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: 'inviter-123',
      };

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => mockInvitation),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      expect(() => invitationService.acceptInvitation('used-token', 'user-123')).toThrow(
        'This invitation has already been used or cancelled'
      );
    });

    it('should throw error when invitation is expired', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'user@example.com',
        role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        invited_by_id: 'inviter-123',
      };

      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => mockInvitation),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      expect(() => invitationService.acceptInvitation('expired-token', 'user-123')).toThrow(
        'This invitation has expired'
      );
    });

    it('should throw error when user email does not match invitation', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'invited@example.com',
        role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: 'inviter-123',
      };

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          if (callCount === 1) return mockInvitation;
          if (callCount === 2) return { email: 'different@example.com' };
          return undefined;
        }),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      expect(() => invitationService.acceptInvitation('token-123', 'user-123')).toThrow(
        'Unable to accept invitation'
      );
    });

    it('should return alreadyMember when user is already a member', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'user@example.com',
        role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: 'inviter-123',
      };

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          if (callCount === 1) return mockInvitation;
          if (callCount === 2) return { email: 'user@example.com' };
          if (callCount === 3) return { id: 'member-123' }; // Already a member
          return undefined;
        }),
        run: vi.fn(() => ({ changes: 1 })),
        all: vi.fn(),
      } as any);

      const result = invitationService.acceptInvitation('token-123', 'user-123');

      expect(result).toEqual({
        success: true,
        alreadyMember: true,
      });
    });

    it('should throw error when user is organization owner', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'owner@example.com',
        role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: 'inviter-123',
      };

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          if (callCount === 1) return mockInvitation;
          if (callCount === 2) return { email: 'owner@example.com' };
          if (callCount === 3) return undefined; // Not already a member
          if (callCount === 4) return { created_by_id: 'user-123' }; // User is owner
          return undefined;
        }),
        run: vi.fn(),
        all: vi.fn(),
      } as any);

      expect(() => invitationService.acceptInvitation('token-123', 'user-123')).toThrow(
        'Unable to accept invitation'
      );
    });

    it('should handle case-insensitive email matching', () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        email: 'User@Example.COM',
        role: 'editor',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: 'inviter-123',
      };

      let callCount = 0;
      vi.mocked(db.prepare).mockReturnValue({
        get: vi.fn(() => {
          callCount++;
          if (callCount === 1) return mockInvitation;
          if (callCount === 2) return { email: 'user@example.com' };
          if (callCount === 3) return undefined;
          if (callCount === 4) return { created_by_id: 'other-user' };
          return undefined;
        }),
        run: vi.fn(() => ({ changes: 1 })),
        all: vi.fn(),
      } as any);

      const result = invitationService.acceptInvitation('token-123', 'user-123');

      expect(result.success).toBe(true);
    });
  });
});
