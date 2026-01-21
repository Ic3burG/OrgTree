import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/client';
import { SearchResult } from '../types';

type SearchType = 'all' | 'departments' | 'people';

interface SearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  defaultType?: SearchType;
  limit?: number;
  defaultStarredOnly?: boolean;
}

interface SearchSuggestion {
  text: string;
  type: 'department' | 'person';
}

interface UseSearchReturn {
  query: string;
  type: SearchType;
  starredOnly: boolean;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  setQuery: (query: string) => void;
  setType: (type: SearchType) => void;
  setStarredOnly: (starred: boolean) => void;
  updateQuery: (query: string, type?: SearchType) => void;
  clearSearch: () => void;
  searchNow: (q?: string, t?: SearchType) => void;
}

/**
 * Custom hook for managing search state with debouncing and API integration
 *
 * @param orgId - Organization ID to search within
 * @param options - Configuration options
 */
export function useSearch(orgId: string | undefined, options: SearchOptions = {}): UseSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    defaultType = 'all',
    limit = 20,
    defaultStarredOnly = false,
  } = options;

  const [query, setQuery] = useState<string>('');
  const [type, setType] = useState<SearchType>(defaultType);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [starredOnly, setStarredOnly] = useState<boolean>(defaultStarredOnly);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  /**
   * Execute search API call
   */
  const executeSearch = useCallback(
    async (
      searchQuery: string,
      searchType: SearchType,
      searchOffset: number = 0
    ): Promise<void> => {
      if (!orgId || searchQuery.length < minQueryLength) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const data = await api.search(orgId, {
          q: searchQuery,
          type: searchType,
          limit: limit.toString(),
          offset: searchOffset.toString(),
          ...(starredOnly && { starred: 'true' }),
        });

        const newResults = data.results || [];
        const newTotal = data.total || 0;

        setResults(newResults);
        setTotal(newTotal);
        setHasMore(data.pagination?.hasMore || false);

        // Track search event (only for first page to avoid duplicates on pagination)
        // if (searchOffset === 0) {
        //   track('search_performed', {
        //     query_length: searchQuery.length,
        //     type: searchType,
        //     results_count: newTotal,
        //     has_results: newTotal > 0,
        //     starred_only: starredOnly
        //   });
        // }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message || 'Search failed');
          setResults([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [orgId, minQueryLength, limit, starredOnly]
  );

  /**
   * Fetch autocomplete suggestions
   */
  const fetchSuggestions = useCallback(
    async (q: string): Promise<void> => {
      if (!orgId || q.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const data = await api.searchAutocomplete(orgId, q, 5);
        const suggestions = (data.suggestions || []).map(suggestion => ({
          text: suggestion.text,
          type: suggestion.type,
        }));
        setSuggestions(suggestions);
      } catch {
        setSuggestions([]);
      }
    },
    [orgId]
  );

  /**
   * Debounced search effect - triggers when query or type changes
   */
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < minQueryLength) {
      setResults([]);
      setSuggestions([]);
      setTotal(0);
      setHasMore(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      executeSearch(query, type, 0);
      fetchSuggestions(query);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, type, starredOnly, executeSearch, fetchSuggestions, debounceMs, minQueryLength]);

  /**
   * Clear all search state
   */
  const clearSearch = useCallback((): void => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setHasMore(false);
    setError(null);
  }, []);

  /**
   * Update query and optionally the type
   */
  const updateQuery = useCallback((newQuery: string, newType?: SearchType): void => {
    setQuery(newQuery);
    if (newType !== undefined) {
      setType(newType);
    }
  }, []);

  return {
    // State
    query,
    type,
    starredOnly,
    results,
    suggestions,
    loading,
    error,
    total,
    hasMore,

    // Actions
    setQuery,
    setType,
    setStarredOnly,
    updateQuery,
    clearSearch,

    // Direct search (bypasses debounce)
    searchNow: (q?: string, t?: SearchType): void => {
      executeSearch(q || query, t || type, 0);
    },
  };
}

export default useSearch;
