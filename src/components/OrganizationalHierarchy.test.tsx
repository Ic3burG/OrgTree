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
import OrganizationalHierarchy from './OrganizationalHierarchy';

describe('OrganizationalHierarchy', () => {
  const hierarchy = [
    { id: '1', name: 'CEO Office', depth: 0 },
    { id: '2', name: 'Operations', depth: 1 },
    { id: '3', name: 'Engineering', depth: 2 },
  ];

  it('should render all hierarchy levels', () => {
    render(<OrganizationalHierarchy hierarchy={hierarchy} currentDepartmentId="3" />);

    expect(screen.getByText('CEO Office')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('should highlight current department', () => {
    render(<OrganizationalHierarchy hierarchy={hierarchy} currentDepartmentId="2" />);

    const current = screen.getByText('Operations').closest('div');
    expect(current).toHaveClass('bg-blue-100');
  });

  it('should call onNavigate when clicking non-current department', () => {
    const onNavigate = vi.fn();
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="3"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Operations'));
    expect(onNavigate).toHaveBeenCalledWith('2');
  });

  it('should not call onNavigate for current department', () => {
    const onNavigate = vi.fn();
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="2"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Operations'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
