import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PendingTransferBanner from './PendingTransferBanner';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { ToastProvider } from '../ui/Toast';
import type { OwnershipTransfer } from '../../types';

// Mock API
vi.mock('../../api/client', () => ({
  api: {
    acceptOwnershipTransfer: vi.fn(),
    rejectOwnershipTransfer: vi.fn(),
    cancelOwnershipTransfer: vi.fn(),
  },
}));

// Mock Auth
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('PendingTransferBanner', () => {
  const mockOnUpdate = vi.fn();
  const mockTransfer = {
    id: 'transfer-123',
    organization_id: 'org-1', // Ensure this matches type definition (organization_id)
    from_user_id: 'owner-id',
    to_user_id: 'recipient-id',
    status: 'pending',
    created_at: '2023-01-01',
    expires_at: '2023-01-02',
    from_user_name: 'Alice',
    to_user_name: 'Bob',
    reason: ' Retirement',
    completed_at: null,
  } as OwnershipTransfer;

  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to unrelated user
    (useAuth as Mock).mockReturnValue({ user: { id: 'unrelated-id' } });

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders nothing if status is not pending', () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'recipient-id' } });
    render(
      <ToastProvider>
        <PendingTransferBanner
          transfer={{ ...mockTransfer, status: 'accepted' }}
          onUpdate={mockOnUpdate}
        />
      </ToastProvider>
    );
    expect(screen.queryByText(/ownership transfer/i)).not.toBeInTheDocument();
  });

  it('renders nothing if user is not involved', () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'other-id' } });
    render(
      <ToastProvider>
        <PendingTransferBanner transfer={mockTransfer} onUpdate={mockOnUpdate} />
      </ToastProvider>
    );
    expect(screen.queryByText(/ownership transfer/i)).not.toBeInTheDocument();
  });

  it('renders for recipient with accept/reject buttons', () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'recipient-id' } });
    render(
      <ToastProvider>
        <PendingTransferBanner transfer={mockTransfer} onUpdate={mockOnUpdate} />
      </ToastProvider>
    );

    expect(screen.getByText('Action Required: Ownership Transfer')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/" Retirement"/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('renders for initiator with cancel button', () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'owner-id' } });
    render(
      <ToastProvider>
        <PendingTransferBanner transfer={mockTransfer} onUpdate={mockOnUpdate} />
      </ToastProvider>
    );

    expect(screen.getByText('Ownership Transfer Pending')).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
  });

  it('handles accept action', async () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'recipient-id' } });
    (api.acceptOwnershipTransfer as Mock).mockResolvedValue({});

    render(
      <ToastProvider>
        <PendingTransferBanner transfer={mockTransfer} onUpdate={mockOnUpdate} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(api.acceptOwnershipTransfer).toHaveBeenCalledWith(mockTransfer.id);
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('handles reject action', async () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'recipient-id' } });
    (api.rejectOwnershipTransfer as Mock).mockResolvedValue({});

    render(
      <ToastProvider>
        <PendingTransferBanner transfer={mockTransfer} onUpdate={mockOnUpdate} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(api.rejectOwnershipTransfer).toHaveBeenCalledWith(mockTransfer.id);
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('handles cancel action', async () => {
    (useAuth as Mock).mockReturnValue({ user: { id: 'owner-id' } });
    (api.cancelOwnershipTransfer as Mock).mockResolvedValue({});

    render(
      <ToastProvider>
        <PendingTransferBanner transfer={mockTransfer} onUpdate={mockOnUpdate} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(api.cancelOwnershipTransfer).toHaveBeenCalledWith(mockTransfer.id);
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
