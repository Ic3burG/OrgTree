import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransferHistoryList from './TransferHistoryList';
import type { OwnershipTransfer } from '../../types';

describe('TransferHistoryList', () => {
  const mockTransfers: OwnershipTransfer[] = [
    {
      id: '1',
      organization_id: 'org-1',
      from_user_id: 'user-1',
      to_user_id: 'user-2',
      status: 'accepted',
      created_at: '2023-01-01',
      expires_at: '2023-01-02',
      from_user_name: 'Alice',
      to_user_name: 'Bob',
      completed_at: '2023-01-02',
      reason: 'test',
    },
    {
      id: '2',
      organization_id: 'org-1',
      from_user_id: 'user-1',
      to_user_id: 'user-3',
      status: 'rejected',
      created_at: '2023-01-03',
      expires_at: '2023-01-04',
      from_user_name: 'Alice',
      to_user_name: 'Charlie',
      reason: 'test',
      completed_at: null,
    },
    {
      id: '3',
      organization_id: 'org-1',
      from_user_id: 'user-1',
      to_user_id: 'user-4',
      status: 'pending', // Should be filtered out
      created_at: '2023-01-05',
      expires_at: '2023-01-06',
      from_user_name: 'Alice',
      to_user_name: 'Dave',
      reason: 'test',
      completed_at: null,
    },
  ];

  it('renders loading state', () => {
    const { container } = render(<TransferHistoryList transfers={[]} loading={true} />);
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state', () => {
    render(<TransferHistoryList transfers={[]} loading={false} />);
    expect(screen.getByText('No transfer history available.')).toBeInTheDocument();
  });

  it('renders completed transfers and ignores pending ones', () => {
    render(<TransferHistoryList transfers={mockTransfers} loading={false} />);

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Check status texts
    expect(screen.getByText('Completed')).toBeInTheDocument(); // Accepted
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    // Pending transfer should not be shown
    expect(screen.queryByText('Dave')).not.toBeInTheDocument();
  });
});
