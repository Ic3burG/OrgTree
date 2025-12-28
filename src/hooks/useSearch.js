import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/client';

/**
 * Custom hook for managing search state with debouncing and API integration
 *
 * @param {string} orgId - Organization ID to search within
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay in ms (default: 300)
 * @param {number} options.minQueryLength - Minimum query length to trigger search (default: 1)
 * @param {string} options.defaultType - Default search type: 'all' | 'departments' | 'people' (default: 'all')
 * @param {number} options.limit - Max results per search (default: 20)
 */
export function useSearch(orgId, options = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    defaultType = 'all',
    limit = 20
  } = options;

  const [query, setQuery] = useState('');
  const [type, setType] = useState(defaultType);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const debounceTimer = useRef(null);
  const abortController = useRef(null);

  /**
   * Execute search API call
   */
  const executeSearch = useCallback(async (searchQuery, searchType, searchOffset = 0) => {
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
        offset: searchOffset.toString()
      });

      setResults(data.results || []);
      setTotal(data.total || 0);
      setHasMore(data.pagination?.hasMore || false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Search failed');
        setResults([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, minQueryLength, limit]);

  /**
   * Fetch autocomplete suggestions
   */
  const fetchSuggestions = useCallback(async (q) => {
    if (!orgId || q.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const data = await api.searchAutocomplete(orgId, q, 5);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setSuggestions([]);
    }
  }, [orgId]);

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
  }, [query, type, executeSearch, fetchSuggestions, debounceMs, minQueryLength]);

  /**
   * Clear all search state
   */
  const clearSearch = useCallback(() => {
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
  const updateQuery = useCallback((newQuery, newType) => {
    setQuery(newQuery);
    if (newType !== undefined) {
      setType(newType);
    }
  }, []);

  return {
    // State
    query,
    type,
    results,
    suggestions,
    loading,
    error,
    total,
    hasMore,

    // Actions
    setQuery,
    setType,
    updateQuery,
    clearSearch,

    // Direct search (bypasses debounce)
    searchNow: (q, t) => executeSearch(q || query, t || type, 0)
  };
}

export default useSearch;
