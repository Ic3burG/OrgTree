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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonManager from './PersonManager';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { usePeople } from '../../hooks/usePeople';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { useSearch } from '../../hooks/useSearch';

vi.mock('../../hooks/usePeople');
vi.mock('../../hooks/useRealtimeUpdates');
vi.mock('../../hooks/useSearch');
vi.mock('../../api/client');

describe('PersonManager', () => {
  const orgId = 'org-1';
  const mockPeople = [{ id: 'p1', name: 'Person 1', departmentName: 'Dept 1' }];
  const mockDepartments = [{ id: 'd1', name: 'Dept 1' }];

  const mockHookReturn = {
    people: mockPeople,
    departments: mockDepartments,
    fieldDefinitions: [],
    loading: false,
    error: null,
    loadData: vi.fn(),
    createPerson: vi.fn(),
    updatePerson: vi.fn(),
    deletePerson: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePeople).mockReturnValue(mockHookReturn as any);
    vi.mocked(useRealtimeUpdates).mockReturnValue({ isRecentlyChanged: vi.fn() } as any);
    vi.mocked(useSearch).mockReturnValue({
      query: '',
      setQuery: vi.fn(),
      results: [],
      loading: false,
      total: 0,
    } as any);
  });

  const renderComponent = () => {
    render(
      <MemoryRouter initialEntries={[`/org/${orgId}/people`]}>
        <Routes>
          <Route path="/org/:orgId/people" element={<PersonManager />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render person list', () => {
    renderComponent();
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Dept 1')).toBeInTheDocument();
  });

  it('should display hook error', () => {
    vi.mocked(usePeople).mockReturnValue({
      ...mockHookReturn,
      error: 'Failed to fetch',
    } as any);
    renderComponent();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });
});
