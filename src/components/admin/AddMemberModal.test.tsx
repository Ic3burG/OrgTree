import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AddMemberModal from './AddMemberModal';
import api from '../../api/client';

// Mock API
vi.mock('../../api/client', () => {
  const mockApi = {
    addMemberByEmail: vi.fn(),
    searchUsers: vi.fn(),
    sendInvitation: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
  };
});

describe('AddMemberModal', () => {
  const mockOnClose = vi.fn();
  const mockOnMemberAdded = vi.fn();
  const orgId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles "User not found" scenario correctly', async () => {
    // Mock addMemberByEmail to throw "User not found" error
    // This simulates the behavior of our updated api.client.ts
    vi.mocked(api.addMemberByEmail).mockRejectedValue(new Error('User not found'));

    render(
      <AddMemberModal
        isOpen={true}
        onClose={mockOnClose}
        onMemberAdded={mockOnMemberAdded}
        orgId={orgId}
      />
    );

    // Enter email
    const emailInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(emailInput, { target: { value: 'unknown@example.com' } });

    // Click Add Member
    const addButton = screen.getByRole('button', { name: /add member/i });
    fireEvent.click(addButton);

    // Should show loading state
    expect(screen.getByText(/adding/i)).toBeInTheDocument();

    // specific check for the user not found UI
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
      expect(screen.getByText(/no account exists with this email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
    });

    // Ensure onMemberAdded was NOT called
    expect(mockOnMemberAdded).not.toHaveBeenCalled();
  });

  it('successfully adds an existing user', async () => {
    vi.mocked(api.addMemberByEmail).mockResolvedValue({
      id: 'member-1',
      organization_id: orgId,
      user_id: 'user-1',
      role: 'viewer',
      joined_at: '2023-01-01',
    });

    render(
      <AddMemberModal
        isOpen={true}
        onClose={mockOnClose}
        onMemberAdded={mockOnMemberAdded}
        orgId={orgId}
      />
    );

    // Enter email
    const emailInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

    // Click Add Member
    const addButton = screen.getByRole('button', { name: /add member/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnMemberAdded).toHaveBeenCalled();
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
