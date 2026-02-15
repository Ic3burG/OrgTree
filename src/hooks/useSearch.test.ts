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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSearch from './useSearch';
import api from '../api/client';
import { SearchResult } from '../types';

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    search: vi.fn(),
    searchAutocomplete: vi.fn(),
  },
}));

describe('useSearch', () => {
  const mockOrgId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSearch(mockOrgId));

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('updates query state', () => {
    const { result } = renderHook(() => useSearch(mockOrgId));

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');
  });

  it('executes search after debounce', async () => {
    const mockResults = [{ id: '1', name: 'Test Result', type: 'person' }] as SearchResult[];
    vi.mocked(api.search).mockResolvedValue({
      results: mockResults,
      total: 1,
      query: 'testing',
      pagination: { hasMore: false, offset: 0, limit: 20 },
    });

    const { result } = renderHook(() => useSearch(mockOrgId, { debounceMs: 500 }));

    act(() => {
      result.current.setQuery('testing');
    });

    // Should not have called yet
    expect(api.search).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(api.search).toHaveBeenCalledWith(mockOrgId, expect.objectContaining({ q: 'testing' }));

    // Wait for async state update
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.results).toEqual(mockResults);
  });

  it('handles empty query clearing results', () => {
    const { result } = renderHook(() => useSearch(mockOrgId));

    act(() => {
      result.current.setQuery('');
    });

    // Should clear immediately without API call
    expect(api.search).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('handles search error', async () => {
    // Use a 400-level error (client error) which is non-retryable
    const error = new Error('API Failure');
    (error as Error & { status?: number }).status = 400;
    vi.mocked(api.search).mockRejectedValue(error);

    const { result } = renderHook(() => useSearch(mockOrgId));

    act(() => {
      result.current.setQuery('fail');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Wait for async state update
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe('API Failure');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches suggestions', async () => {
    vi.mocked(api.searchAutocomplete).mockResolvedValue({
      suggestions: [
        { text: 'suggestion 1', type: 'department', id: '1' },
        { text: 'suggestion 2', type: 'person', id: '2' },
      ],
    });

    const { result } = renderHook(() => useSearch(mockOrgId));

    act(() => {
      result.current.setQuery('sug');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.autocompleteSuggestions).toHaveLength(2);
    expect(result.current.autocompleteSuggestions).toBeDefined();
    if (result.current.autocompleteSuggestions[0]) {
      expect(result.current.autocompleteSuggestions[0].text).toBe('suggestion 1');
    }
  });

  it('populates didYouMeanSuggestions from search response', async () => {
    vi.mocked(api.search).mockResolvedValue({
      results: [],
      total: 0,
      query: 'Alix',
      pagination: { hasMore: false, offset: 0, limit: 20 },
      suggestions: ['Alice Johnson'],
    });

    const { result } = renderHook(() => useSearch(mockOrgId));

    act(() => {
      result.current.setQuery('Alix');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.didYouMeanSuggestions).toEqual(['Alice Johnson']);
  });

  it('clears search', () => {
    const { result } = renderHook(() => useSearch(mockOrgId));

    act(() => {
      result.current.setQuery('something');
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
  });
});
