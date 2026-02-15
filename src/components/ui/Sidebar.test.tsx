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

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

// Mock dependencies
vi.mock('../../hooks/useResizable', () => ({
  useResizable: ({ initialWidth }: { initialWidth: number }) => ({
    width: initialWidth,
    isResizing: false,
    handleMouseDown: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  const defaultProps = {
    state: 'expanded' as const,
    width: 256,
    pinned: true,
    onStateChange: vi.fn(),
    onWidthChange: vi.fn(),
    onPinnedChange: vi.fn(),
    navigation: <nav>Navigation</nav>,
    header: <div>Header</div>,
    footer: <div>Footer</div>,
  };

  it('renders correctly in expanded state', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeVisible(); // Header visible in expanded
    expect(screen.getByRole('separator')).toBeInTheDocument(); // Resize handle
  });

  it('renders correctly in minimized state', () => {
    render(<Sidebar {...defaultProps} state="minimized" />);
    // In minimized, header is still in DOM (layout handles visibility)
    // We check that resize handle is NOT present
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('toggles state when collapse button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const toggleBtn = screen.getByTitle('Minimize sidebar');
    fireEvent.click(toggleBtn);
    expect(defaultProps.onStateChange).toHaveBeenCalledWith('minimized');
  });

  it('toggles pin state', () => {
    render(<Sidebar {...defaultProps} />);
    const pinBtn = screen.getByTitle('Unpin sidebar (auto-collapse on navigate)');
    fireEvent.click(pinBtn);
    expect(defaultProps.onPinnedChange).toHaveBeenCalledWith(false);
  });

  it('shows FAB when hidden', () => {
    render(<Sidebar {...defaultProps} state="hidden" />);
    const fab = screen.getByLabelText('Open sidebar');
    expect(fab).toBeInTheDocument();

    fireEvent.click(fab);
    expect(defaultProps.onStateChange).toHaveBeenCalledWith('expanded');
  });
});
