import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ShareModal from './ShareModal';
import api from '../../api/client';
import { ToastProvider } from '../ui/Toast';

// Mock API
vi.mock('../../api/client', () => ({
  default: {
    getShareSettings: vi.fn(),
    updateShareSettings: vi.fn(),
    getOrgMembers: vi.fn(),
    getInvitations: vi.fn(),
  },
}));

// Mock hooks
vi.mock('../../hooks/useRealtimeUpdates', () => ({
  useRealtimeUpdates: vi.fn(),
}));

describe('ShareModal', () => {
  const mockOnClose = vi.fn();
  const orgId = 'org-123';
  const orgName = 'Test Org';

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getOrgMembers as Mock).mockResolvedValue({ owner: null, members: [] });
    (api.getInvitations as Mock).mockResolvedValue([]);
  });

  it('handles camelCase isPublic from API correctly on load', async () => {
    // Mock API returning camelCase isPublic
    (api.getShareSettings as Mock).mockResolvedValue({
      isPublic: true, // camelCase
      shareUrl: 'http://example.com/share',
    });

    render(
      <ToastProvider>
        <ShareModal orgId={orgId} orgName={orgName} onClose={mockOnClose} />
      </ToastProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    // Verify toggle is in "Public" state (bg-blue-600)
    screen.getByRole('button', { name: 'Toggle public access' });
    expect(screen.getByText('Anyone with the link can view')).toBeInTheDocument();
  });

  it('handles camelCase isPublic from API correctly on toggle', async () => {
    // Start as Private
    (api.getShareSettings as Mock).mockResolvedValue({
      isPublic: false,
      shareUrl: '',
    });

    // Mock update response with camelCase
    (api.updateShareSettings as Mock).mockResolvedValue({
      isPublic: true, // camelCase
      shareUrl: 'http://example.com/share',
    });

    render(
      <ToastProvider>
        <ShareModal orgId={orgId} orgName={orgName} userRole="admin" onClose={mockOnClose} />
      </ToastProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    // Click toggle
    const toggle = screen.getByLabelText('Toggle public access');
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    // Expect it to become Public
    await waitFor(() => {
      expect(api.updateShareSettings).toHaveBeenCalledWith(orgId, true);
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('Organization is now public')).toBeInTheDocument(); // Toast message
    });
  });
});
