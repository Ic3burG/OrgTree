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

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SearchOverlay from './SearchOverlay';
import { useSearch } from '../hooks/useSearch';
import { MemoryRouter } from 'react-router-dom';

// Mock hooks
vi.mock('../hooks/useSearch', () => ({
  useSearch: vi.fn(),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="clear-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Star: ({ fill }: { fill?: string }) => <div data-testid="star-icon" data-fill={fill} />,
  AlertTriangle: () => <div data-testid="warning-icon" />,
  AlertCircle: () => <div data-testid="info-icon" />,
}));

type MockUseSearch = ReturnType<typeof useSearch>;

describe('SearchOverlay', () => {
  const mockOnSelectResult = vi.fn();
  const mockOrgId = 'org-123';

  const mockUseSearchValue: Partial<MockUseSearch> = {
    query: '',
    setQuery: vi.fn(),
    type: 'all',
    setType: vi.fn(),
    starredOnly: false,
    setStarredOnly: vi.fn(),
    results: [],
    autocompleteSuggestions: [],
    didYouMeanSuggestions: [],
    loading: false,
    total: 0,
    clearSearch: vi.fn(),
    retryCount: 0,
    warnings: [],
    usedFallback: false,
    fromCache: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSearch as Mock).mockReturnValue(mockUseSearchValue);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SearchOverlay orgId={mockOrgId} onSelectResult={mockOnSelectResult} />
      </MemoryRouter>
    );
  };

  it('renders search input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/Search departments and people/i)).toBeDefined();
  });

  it('handles query change', () => {
    const setQuery = vi.fn();
    (useSearch as Mock).mockReturnValue({ ...mockUseSearchValue, setQuery });

    renderComponent();
    const input = screen.getByPlaceholderText(/Search departments and people/i);
    fireEvent.change(input, { target: { value: 'test' } });

    expect(setQuery).toHaveBeenCalledWith('test');
  });

  it('displays results when query is present', async () => {
    const mockResults = [
      { type: 'department', id: 'dept-1', name: 'Engineering', people_count: 5 },
      {
        type: 'person',
        id: 'p1',
        name: 'John Doe',
        title: 'Developer',
        department_name: 'Engineering',
        is_starred: false,
      },
    ];
    (useSearch as Mock).mockReturnValue({
      ...mockUseSearchValue,
      query: 'Eng',
      results: mockResults,
      total: 2,
    });

    renderComponent();

    expect(screen.getByText('Engineering')).toBeDefined();
    expect(screen.getByText('5 people')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Developer')).toBeDefined();
  });

  it('handles result selection', () => {
    const mockResults = [
      { type: 'department', id: 'dept-1', name: 'Engineering', people_count: 5, is_starred: false },
    ];
    (useSearch as Mock).mockReturnValue({
      ...mockUseSearchValue,
      query: 'Eng',
      results: mockResults,
    });

    renderComponent();

    fireEvent.click(screen.getByText('Engineering'));

    expect(mockOnSelectResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'department',
        id: 'dept-1',
        nodeId: 'dept-1',
      })
    );
  });

  it('toggles type filter dropdown', () => {
    renderComponent();

    const filterBtn = screen.getByLabelText('Filter search type');
    fireEvent.click(filterBtn);

    expect(screen.getByText('Search in:')).toBeDefined();
    expect(screen.getByText('Departments')).toBeDefined();
    expect(screen.getByText('People')).toBeDefined();
  });

  it('handles type filter selection', () => {
    const setType = vi.fn();
    (useSearch as Mock).mockReturnValue({ ...mockUseSearchValue, setType });

    renderComponent();

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Filter search type'));

    // Select 'People'
    fireEvent.click(screen.getByText('People'));

    expect(setType).toHaveBeenCalledWith('people');
  });

  it('toggles starred only filter', () => {
    const setStarredOnly = vi.fn();
    (useSearch as Mock).mockReturnValue({ ...mockUseSearchValue, setStarredOnly });

    renderComponent();

    const starBtn = screen.getByLabelText('Filter starred only');
    fireEvent.click(starBtn);

    expect(setStarredOnly).toHaveBeenCalledWith(true);
  });

  it('shows loader when loading', () => {
    (useSearch as Mock).mockReturnValue({ ...mockUseSearchValue, loading: true });

    renderComponent();
    expect(screen.getAllByTestId('loader-icon').length).toBeGreaterThan(0);
  });

  it('shows no results message', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <SearchOverlay orgId={mockOrgId} onSelectResult={mockOnSelectResult} />
      </MemoryRouter>
    );

    // 1. Initial state - no query, closed
    expect(screen.queryByText(/No results found/i)).toBeNull();

    // 2. Loading state - should open
    (useSearch as Mock).mockReturnValue({
      ...mockUseSearchValue,
      query: 'unknown',
      loading: true,
    });

    act(() => {
      rerender(
        <MemoryRouter>
          <SearchOverlay orgId={mockOrgId} onSelectResult={mockOnSelectResult} />
        </MemoryRouter>
      );
    });

    expect(screen.getAllByTestId('loader-icon').length).toBeGreaterThan(0);

    // 3. Not loading, no results - should stay open and show message
    (useSearch as Mock).mockReturnValue({
      ...mockUseSearchValue,
      query: 'unknown',
      results: [],
      autocompleteSuggestions: [],
      didYouMeanSuggestions: [],
      loading: false,
    });

    act(() => {
      rerender(
        <MemoryRouter>
          <SearchOverlay orgId={mockOrgId} onSelectResult={mockOnSelectResult} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/No results found for "unknown"/i)).toBeDefined();
    });
  });

  it('shows "Did you mean?" suggestions when available', async () => {
    (useSearch as Mock).mockReturnValue({
      ...mockUseSearchValue,
      query: 'Alix',
      results: [],
      autocompleteSuggestions: [],
      didYouMeanSuggestions: ['Alice Johnson'],
      loading: false,
    });

    renderComponent();

    expect(screen.getByText(/Did you mean\?/i)).toBeDefined();
    expect(screen.getByText('Alice Johnson')).toBeDefined();

    const setQuery = mockUseSearchValue.setQuery;
    fireEvent.click(screen.getByText('Alice Johnson'));
    expect(setQuery).toHaveBeenCalledWith('Alice Johnson');
  });
});
