/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransferHistoryList from './TransferHistoryList';
import type { OwnershipTransfer } from '../../types';

describe('TransferHistoryList', () => {
  const mockTransfers: OwnershipTransfer[] = [
    {
      id: '1',
      organizationId: 'org-1',
      organization_id: 'org-1',
      fromUserId: 'user-1',
      from_user_id: 'user-1',
      toUserId: 'user-2',
      to_user_id: 'user-2',
      status: 'accepted',
      initiatedAt: '2023-01-01',
      createdAt: '2023-01-01',
      created_at: '2023-01-01',
      expiresAt: '2023-01-02',
      expires_at: '2023-01-02',
      from_user_name: 'Alice',
      to_user_name: 'Bob',
      completedAt: '2023-01-02',
      completed_at: '2023-01-02',
      reason: 'test',
      updatedAt: '2023-01-02',
    },
    {
      id: '2',
      organizationId: 'org-1',
      organization_id: 'org-1',
      fromUserId: 'user-1',
      from_user_id: 'user-1',
      toUserId: 'user-3',
      to_user_id: 'user-3',
      status: 'rejected',
      initiatedAt: '2023-01-03',
      createdAt: '2023-01-03',
      created_at: '2023-01-03',
      expiresAt: '2023-01-04',
      expires_at: '2023-01-04',
      from_user_name: 'Alice',
      to_user_name: 'Charlie',
      reason: 'test',
      completedAt: null,
      completed_at: null,
      updatedAt: '2023-01-03',
    },
    {
      id: '3',
      organizationId: 'org-1',
      organization_id: 'org-1',
      fromUserId: 'user-1',
      from_user_id: 'user-1',
      toUserId: 'user-4',
      to_user_id: 'user-4',
      status: 'pending', // Should be filtered out
      initiatedAt: '2023-01-05',
      createdAt: '2023-01-05',
      created_at: '2023-01-05',
      expiresAt: '2023-01-06',
      expires_at: '2023-01-06',
      from_user_name: 'Alice',
      to_user_name: 'Dave',
      reason: 'test',
      completedAt: null,
      completed_at: null,
      updatedAt: '2023-01-05',
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
