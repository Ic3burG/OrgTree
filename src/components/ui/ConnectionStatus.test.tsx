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

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConnectionStatus from './ConnectionStatus';
import * as SocketContext from '../../contexts/SocketContext';

// Mock SocketContext
vi.mock('../../contexts/SocketContext', () => ({
  useSocket: vi.fn(),
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders disconnected state by default/error', () => {
    const mockValue: Partial<ReturnType<typeof SocketContext.useSocket>> = {
      isConnected: false,
      connectionError: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(SocketContext, 'useSocket').mockReturnValue(mockValue as any);

    render(<ConnectionStatus />);

    const indicator = screen.getByTitle('Disconnected');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-gray-400');
  });

  it('renders connected state', () => {
    vi.spyOn(SocketContext, 'useSocket').mockReturnValue({
      isConnected: true,
      connectionError: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<ConnectionStatus />);

    const indicator = screen.getByTitle('Real-time updates active');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-green-500');
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('renders error state', () => {
    vi.spyOn(SocketContext, 'useSocket').mockReturnValue({
      isConnected: false,
      connectionError: 'Network failed',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<ConnectionStatus />);

    const indicator = screen.getByTitle('Connection error: Network failed');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-amber-500');
  });
});
