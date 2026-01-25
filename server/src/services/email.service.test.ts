import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

// Mock Resend
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

describe('Email Service', () => {
  let emailService: typeof import('./email.service.js');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.RESEND_API_KEY = 'test-api-key';

    // Reset default mock implementation
    mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });

    // Dynamically import service AFTER setting env var
    emailService = await import('./email.service.js');
  });

  describe('isEmailConfigured', () => {
    it('should return true if RESEND_API_KEY is present', () => {
      expect(emailService.isEmailConfigured()).toBe(true);
    });

    it('should return false if RESEND_API_KEY is missing', async () => {
      vi.resetModules();
      const originalApiKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const service = await import('./email.service.js');
      expect(service.isEmailConfigured()).toBe(false);

      process.env.RESEND_API_KEY = originalApiKey;
    });
  });

  describe('sendInvitationEmail', () => {
    it('should send an invitation email successfully', async () => {
      const result = await emailService.sendInvitationEmail({
        to: 'test@example.com',
        inviterName: 'Inviter',
        orgName: 'Org',
        role: 'admin',
        token: 'token-123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-1');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: expect.stringContaining('invited to join Org'),
        })
      );
    });

    it('should handle send errors', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Failed to send' } });

      const result = await emailService.sendInvitationEmail({
        to: 'fail@example.com',
        inviterName: 'Inviter',
        orgName: 'Org',
        role: 'admin',
        token: 'token-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send');
    });

    it('should handle exceptions', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await emailService.sendInvitationEmail({
        to: 'crash@example.com',
        inviterName: 'Inviter',
        orgName: 'Org',
        role: 'admin',
        token: 'token-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should fail if service not configured', async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;
      const service = await import('./email.service.js');

      const result = await service.sendInvitationEmail({
        to: 'test@example.com',
        inviterName: 'A',
        orgName: 'B',
        role: 'admin',
        token: 'C',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('email_not_configured');
    });
  });
});
