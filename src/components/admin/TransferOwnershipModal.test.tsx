import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TransferOwnershipModal from './TransferOwnershipModal';
import { api } from '../../api/client';

// Mock API
vi.mock('../../api/client', () => ({
  api: {
    getOrgMembers: vi.fn(),
    initiateOwnershipTransfer: vi.fn(),
  },
}));

describe('TransferOwnershipModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const orgId = 'org-123';

  const mockMembers = [
    {
      id: '1',
      user_id: 'user-1',
      role: 'admin',
      user: { name: 'Alice', email: 'alice@example.com' },
    },
    { id: '2', user_id: 'user-2', role: 'member', user: { name: 'Bob', email: 'bob@example.com' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getOrgMembers as Mock).mockResolvedValue({
      owner: {
        id: '0',
        user_id: 'owner-0',
        role: 'owner',
        user: { name: 'Owner', email: 'owner@example.com' },
      },
      members: mockMembers,
    });
  });

  it('renders nothing when closed', () => {
    render(
      <TransferOwnershipModal
        isOpen={false}
        onClose={mockOnClose}
        orgId={orgId}
        onSuccess={mockOnSuccess}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders correctly when open', async () => {
    render(
      <TransferOwnershipModal
        isOpen={true}
        onClose={mockOnClose}
        orgId={orgId}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transfer Ownership' })).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();

    // Check if members are loaded
    await waitFor(() => {
      expect(api.getOrgMembers).toHaveBeenCalledWith(orgId);
    });
  });

  it('validates form inputs', async () => {
    render(
      <TransferOwnershipModal
        isOpen={true}
        onClose={mockOnClose}
        orgId={orgId}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => expect(api.getOrgMembers).toHaveBeenCalled());

    const submitButton = screen.getByRole('button', { name: /transfer ownership/i });
    expect(submitButton).toBeDisabled();

    // Select member
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'user-1' } });

    // Type short reason
    const reasonInput = screen.getByPlaceholderText(/explain why/i);
    fireEvent.change(reasonInput, { target: { value: 'Short' } });
    expect(submitButton).toBeDisabled();

    // Type valid reason
    fireEvent.change(reasonInput, { target: { value: 'Valid reason for transfer' } });

    // Type wrong confirm text
    const confirmInput = screen.getByPlaceholderText('TRANSFER');
    fireEvent.change(confirmInput, { target: { value: 'WRONG' } });
    expect(submitButton).toBeDisabled();

    // Type correct confirm text
    fireEvent.change(confirmInput, { target: { value: 'TRANSFER' } });

    expect(submitButton).toBeEnabled();
  });

  it('submits successfully when valid', async () => {
    (api.initiateOwnershipTransfer as Mock).mockResolvedValue({});

    render(
      <TransferOwnershipModal
        isOpen={true}
        onClose={mockOnClose}
        orgId={orgId}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => expect(api.getOrgMembers).toHaveBeenCalled());

    // Fill form
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user-1' } });
    fireEvent.change(screen.getByPlaceholderText(/explain why/i), {
      target: { value: 'Valid reason for transfer' },
    });
    fireEvent.change(screen.getByPlaceholderText('TRANSFER'), { target: { value: 'TRANSFER' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /transfer ownership/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.initiateOwnershipTransfer).toHaveBeenCalledWith(
        orgId,
        'user-1',
        'Valid reason for transfer'
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles submission errors', async () => {
    (api.initiateOwnershipTransfer as Mock).mockRejectedValue(new Error('API Error'));

    render(
      <TransferOwnershipModal
        isOpen={true}
        onClose={mockOnClose}
        orgId={orgId}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => expect(api.getOrgMembers).toHaveBeenCalled());

    // Fill form
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user-1' } });
    fireEvent.change(screen.getByPlaceholderText(/explain why/i), {
      target: { value: 'Valid reason for transfer' },
    });
    fireEvent.change(screen.getByPlaceholderText('TRANSFER'), { target: { value: 'TRANSFER' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /transfer ownership/i }));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
