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
        <ShareModal orgId={orgId} orgName={orgName} role="admin" onClose={mockOnClose} />
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
