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

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Department, Person, SearchResult } from '../types/index';

interface UsePublicSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

interface UsePublicSearchReturn {
  query: string;
  type: 'all' | 'departments' | 'people';
  starredOnly: boolean;
  results: SearchResult[];
  suggestions: { text: string; type: 'department' | 'person' }[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  retryCount: number;
  warnings: string[];
  usedFallback: boolean;
  fromCache: boolean;
  setQuery: (query: string) => void;
  setType: (type: 'all' | 'departments' | 'people') => void;
  setStarredOnly: (starred: boolean) => void;
  updateQuery: (query: string, type?: 'all' | 'departments' | 'people') => void;
  clearSearch: () => void;
  searchNow: (q?: string, t?: 'all' | 'departments' | 'people') => void;
}

/**
 * Client-side search hook for public organization views
 * Filters loaded departments and people data without making API calls
 */
export function usePublicSearch(
  departments: Department[],
  options: UsePublicSearchOptions = {}
): UsePublicSearchReturn {
  const { debounceMs = 300, minQueryLength = 1 } = options;

  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'departments' | 'people'>('all');
  const [starredOnly, setStarredOnly] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Perform client-side search
  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      return [];
    }

    const searchLower = debouncedQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search departments
    if (type === 'all' || type === 'departments') {
      departments.forEach(dept => {
        if (dept.name.toLowerCase().includes(searchLower)) {
          searchResults.push({
            type: 'department',
            id: dept.id,
            name: dept.name,
            highlight: dept.name, // For client-side search, just use the name as highlight
            title: undefined,
            department_name: undefined,
            department_id: dept.id,
            people_count: dept.people?.length || 0,
            is_starred: false,
          });
        }
      });
    }

    // Search people
    if (type === 'all' || type === 'people') {
      departments.forEach(dept => {
        if (dept.people) {
          dept.people.forEach((person: Person) => {
            // Skip if starred filter is enabled and person is not starred
            if (starredOnly && !person.is_starred) {
              return;
            }

            const matchesName = person.name.toLowerCase().includes(searchLower);
            const matchesTitle = person.title?.toLowerCase().includes(searchLower);
            const matchesEmail = person.email?.toLowerCase().includes(searchLower);

            if (matchesName || matchesTitle || matchesEmail) {
              searchResults.push({
                type: 'person',
                id: person.id,
                name: person.name,
                highlight: person.name, // For client-side search, just use the name as highlight
                title: person.title || undefined,
                department_name: dept.name,
                department_id: dept.id,
                people_count: undefined,
                is_starred: person.is_starred || false,
              });
            }
          });
        }
      });
    }

    return searchResults;
  }, [debouncedQuery, type, starredOnly, departments, minQueryLength]);

  // Generate suggestions based on current query
  const suggestions = useMemo(() => {
    if (!query || query.length < 2 || debouncedQuery.length >= minQueryLength) {
      return [];
    }

    const searchLower = query.toLowerCase();
    const suggestions: { text: string; type: 'department' | 'person' }[] = [];

    // Get department name suggestions
    departments.forEach(dept => {
      if (dept.name.toLowerCase().includes(searchLower)) {
        suggestions.push({
          text: dept.name,
          type: 'department',
        });
      }
    });

    // Get people name suggestions
    departments.forEach(dept => {
      dept.people?.forEach((person: Person) => {
        if (person.name.toLowerCase().includes(searchLower)) {
          suggestions.push({
            text: person.name,
            type: 'person',
          });
        }
      });
    });

    // Limit to first 5 suggestions
    return suggestions.slice(0, 5);
  }, [query, debouncedQuery, departments, minQueryLength]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const updateQuery = useCallback(
    (newQuery: string, newType?: 'all' | 'departments' | 'people') => {
      setQuery(newQuery);
      if (newType !== undefined) {
        setType(newType);
      }
    },
    []
  );

  const searchNow = useCallback(
    (q?: string, t?: 'all' | 'departments' | 'people') => {
      setDebouncedQuery(q || query);
      if (t !== undefined) {
        setType(t);
      }
    },
    [query]
  );

  return {
    query,
    type,
    starredOnly,
    results,
    suggestions,
    loading: false, // Client-side search is instant
    error: null,
    total: results.length,
    hasMore: false,
    retryCount: 0,
    warnings: [],
    usedFallback: false,
    fromCache: false,
    setQuery,
    setType,
    setStarredOnly,
    updateQuery,
    clearSearch,
    searchNow,
  };
}

export default usePublicSearch;
