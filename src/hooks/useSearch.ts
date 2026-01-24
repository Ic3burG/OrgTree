import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/client';
import { SearchResult } from '../types';
import { getCachedSearch, cacheSearch, isIndexedDBAvailable } from '../services/searchCache';

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
  retryCount: number;
  warnings: string[];
  usedFallback: boolean;
  fromCache: boolean;
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
  const [retryCount, setRetryCount] = useState<number>(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  /**
   * Determine if an error is retryable (network/server errors, not validation errors)
   */
  const isRetryableError = useCallback((err: unknown): boolean => {
    // Don't retry AbortError or validation errors (400-level)
    if ((err as Error).name === 'AbortError') return false;

    // Check if it's an API error with status code
    const apiError = err as { status?: number };
    if (apiError.status) {
      // Don't retry client errors (400-499), but do retry server errors (500+) and network errors
      return apiError.status >= 500;
    }

    // Retry network errors, timeouts, and other unexpected errors
    return true;
  }, []);

  /**
   * Sleep for exponential backoff
   */
  const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Execute search API call with automatic retry logic
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
        setRetryCount(0);
        setWarnings([]);
        setUsedFallback(false);
        return;
      }

      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setLoading(true);
      setError(null);
      setRetryCount(0);
      setFromCache(false);

      // Check cache first (only for first page)
      if (searchOffset === 0 && isIndexedDBAvailable()) {
        try {
          const cached = await getCachedSearch(orgId, searchQuery, searchType, starredOnly);
          if (cached) {
            setResults(cached.results);
            setTotal(cached.total);
            setHasMore(false); // Cached results are always first page only
            setWarnings(cached.warnings || []);
            setUsedFallback(cached.usedFallback || false);
            setFromCache(true);
            setLoading(false);
            return;
          }
        } catch (cacheErr) {
          // Cache read failed, continue with API call
          console.warn('[useSearch] Cache read failed:', cacheErr);
        }
      }

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
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
          setWarnings(data.warnings || []);
          setUsedFallback(data.usedFallback || false);
          setRetryCount(attempt);

          // Cache successful first-page results
          if (searchOffset === 0 && isIndexedDBAvailable()) {
            cacheSearch(
              orgId,
              searchQuery,
              searchType,
              starredOnly,
              newResults,
              newTotal,
              data.warnings,
              data.usedFallback
            ).catch(err => {
              console.warn('[useSearch] Failed to cache results:', err);
            });
          }

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

          // Success - exit retry loop
          setLoading(false);
          return;
        } catch (err) {
          lastError = err as Error;

          // Don't retry AbortError
          if (lastError.name === 'AbortError') {
            setLoading(false);
            return;
          }

          // Check if error is retryable
          if (!isRetryableError(err)) {
            // Non-retryable error - fail immediately
            setError(lastError.message || 'Search failed');
            setResults([]);
            setTotal(0);
            setHasMore(false);
            setRetryCount(attempt);
            setLoading(false);
            return;
          }

          // Retryable error - apply exponential backoff
          setRetryCount(attempt + 1);

          if (attempt < maxRetries - 1) {
            // Exponential backoff: 1s, 2s, 4s
            const delayMs = Math.pow(2, attempt) * 1000;
            await sleep(delayMs);
          }
        }
      }

      // All retries exhausted
      if (lastError) {
        setError(lastError.message || 'Search failed after retries');
        setResults([]);
        setTotal(0);
        setHasMore(false);
      }
      setLoading(false);
    },
    [orgId, minQueryLength, limit, starredOnly, isRetryableError]
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
    retryCount,
    warnings,
    usedFallback,
    fromCache,

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
