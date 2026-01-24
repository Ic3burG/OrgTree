import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Loader2, Filter, Star, AlertTriangle, AlertCircle } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { SearchResult } from '../types/index';
import { getInitials } from '../utils/helpers';

/**
 * Interface for the transformed result passed to onSelectResult callback
 */
interface TransformedSearchResult {
  type: 'department' | 'person';
  id: string;
  name: string;
  subtitle: string;
  nodeId: string;
  departmentName?: string;
  person?: {
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface SearchOverlayProps {
  orgId: string | undefined;
  onSelectResult?: (result: TransformedSearchResult) => void;
}

/**
 * SearchOverlay - Floating search bar with dropdown results
 * Mobile: Positioned below top nav with larger touch targets
 * Desktop: Positioned at top-center of canvas
 *
 * Uses server-side FTS5 search with autocomplete, fuzzy matching, and type filtering
 */
export default function SearchOverlay({
  orgId,
  onSelectResult,
}: SearchOverlayProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    type,
    setType,
    starredOnly,
    setStarredOnly,
    results,
    suggestions,
    loading,
    total,
    clearSearch,
    retryCount,
    warnings,
    usedFallback,
    fromCache,
  } = useSearch(orgId, { debounceMs: 300, minQueryLength: 1 });

  // Open dropdown when we have results
  useEffect(() => {
    if (query.trim() && (results.length > 0 || loading)) {
      setIsOpen(true);
    } else if (!query.trim()) {
      setIsOpen(false);
    }
  }, [query, results, loading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = (): void => {
    clearSearch();
    setIsOpen(false);
    setShowTypeFilter(false);
  };

  const handleSelectResult = (result: SearchResult): void => {
    setIsOpen(false);
    if (onSelectResult) {
      // Transform API result to format expected by OrgMap
      const transformedResult: TransformedSearchResult = {
        type: result.type,
        id: result.id,
        name: result.name,
        subtitle:
          result.type === 'department' ? `${result.people_count || 0} people` : result.title || '',
        // For departments, nodeId is the department id itself
        // For people, nodeId is the departmentId (from department_name field)
        nodeId: result.type === 'department' ? result.id : result.department_id || result.id,
        departmentName: result.department_name,
        // Pass person data for detail panel
        person:
          result.type === 'person'
            ? {
                id: result.id,
                name: result.name,
                title: result.title || null,
                email: (result as unknown as { email?: string | null }).email || null,
                phone: (result as unknown as { phone?: string | null }).phone || null,
              }
            : null,
      };
      onSelectResult(transformedResult);
    }
  };

  const handleSuggestionClick = (suggestion: {
    text: string;
    type: 'department' | 'person';
  }): void => {
    setQuery(suggestion.text);
  };

  const typeLabels: Record<string, string> = {
    all: 'All',
    departments: 'Departments',
    people: 'People',
  };

  return (
    <div
      ref={searchRef}
      className="absolute top-16 lg:top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4"
    >
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 lg:pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 size={22} className="lg:w-5 lg:h-5 text-blue-500 animate-spin" />
          ) : (
            <Search size={22} className="lg:w-5 lg:h-5 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search departments and people..."
          className="w-full pl-11 lg:pl-10 pr-20 lg:pr-20 py-3 lg:py-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-300 dark:border-slate-600
            rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
            focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-base lg:text-sm
            touch-manipulation"
          aria-label="Search organization"
        />

        {/* Type Filter Button */}
        <button
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          className={`absolute inset-y-0 right-10 flex items-center px-2 text-slate-400 dark:text-slate-500
            hover:text-slate-600 dark:hover:text-slate-300 transition-colors touch-manipulation
            ${type !== 'all' ? 'text-blue-500 dark:text-blue-400' : ''}`}
          aria-label="Filter search type"
        >
          <Filter size={18} className="lg:w-4 lg:h-4" />
        </button>

        {/* Starred Filter Toggle */}
        <button
          onClick={() => setStarredOnly(!starredOnly)}
          className={`absolute inset-y-0 right-16 flex items-center px-2 transition-colors touch-manipulation
            ${
              starredOnly
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          aria-label="Filter starred only"
          title={starredOnly ? 'Showing starred only' : 'Show all'}
        >
          <Star size={18} className={`lg:w-4 lg:h-4 ${starredOnly ? 'fill-current' : ''}`} />
        </button>

        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500
              hover:text-slate-600 dark:hover:text-slate-300 transition-colors touch-manipulation"
            aria-label="Clear search"
          >
            <X size={22} className="lg:w-5 lg:h-5" />
          </button>
        )}
      </div>

      {/* Starred filter indicator */}
      {starredOnly && (
        <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Star size={12} className="fill-current" />
          <span>Showing starred people only</span>
          <button
            onClick={() => setStarredOnly(false)}
            className="ml-1 underline hover:no-underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Degraded Mode Indicators */}
      {(usedFallback || warnings.length > 0 || retryCount > 0) && (
        <div className="mt-2 space-y-1">
          {/* Fallback mode indicator */}
          {usedFallback && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle
                size={16}
                className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Using fallback search
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Full-text search unavailable. Results may be less accurate.
                </p>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle
                size={16}
                className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                  Search notice
                </p>
                {warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Retry indicator */}
          {retryCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
              <Loader2 size={14} className="text-slate-500 dark:text-slate-400 animate-spin" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Retry attempt {retryCount} of 3...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Type Filter Dropdown */}
      {showTypeFilter && (
        <div className="mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 px-2 pb-1">Search in:</div>
          <div className="flex gap-1">
            {(['all', 'departments', 'people'] as const).map(t => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setShowTypeFilter(false);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
                  ${
                    type === t
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions (shown while typing, before results) */}
      {isOpen && suggestions.length > 0 && results.length === 0 && !loading && (
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 px-4 pb-1">Suggestions:</div>
          {suggestions.map((suggestion, index) => (
            <button
              key={`suggestion-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"
            >
              <Search size={14} className="text-slate-400" />
              {suggestion.text}
              <span className="text-xs text-slate-400">({suggestion.type})</span>
            </button>
          ))}
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-[60vh] lg:max-h-96 overflow-y-auto">
          {/* Results count header */}
          {total > 0 && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                {total} result{total !== 1 ? 's' : ''} found
                {type !== 'all' && typeLabels[type] && ` in ${typeLabels[type].toLowerCase()}`}
              </span>
              {fromCache && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  Cached
                </span>
              )}
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}-${index}`}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-4 lg:py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700
                active:bg-slate-100 dark:active:bg-slate-600 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-b-0
                touch-manipulation"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {result.type === 'department' ? (
                  <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Users size={22} className="lg:w-5 lg:h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                ) : (
                  <div
                    className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                    flex items-center justify-center text-white font-semibold text-sm"
                  >
                    {getInitials(result.name || '')}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                {/* Use highlight if available, otherwise plain name */}
                <div className="flex items-center gap-1.5">
                  {(result as unknown as { highlight?: string }).highlight ? (
                    <div
                      className="font-medium text-base lg:text-sm text-slate-900 dark:text-slate-100 truncate [&>mark]:bg-yellow-200 dark:[&>mark]:bg-yellow-900/50 [&>mark]:rounded"
                      dangerouslySetInnerHTML={{
                        __html: (result as unknown as { highlight: string }).highlight,
                      }}
                    />
                  ) : (
                    <div className="font-medium text-base lg:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {result.name}
                    </div>
                  )}
                  {result.type === 'person' && result.is_starred && (
                    <Star size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />
                  )}
                </div>
                <div className="text-sm lg:text-sm text-slate-600 dark:text-slate-400 truncate">
                  {result.type === 'department'
                    ? `${result.people_count || 0} people`
                    : result.title}
                  {result.type === 'person' && result.department_name && (
                    <span className="text-slate-400"> · {result.department_name}</span>
                  )}
                </div>
              </div>

              {/* Type Badge */}
              <div className="flex-shrink-0">
                <span
                  className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${
                    result.type === 'department'
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }
                `}
                >
                  {result.type === 'department' ? 'Dept' : 'Person'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading state with no results yet */}
      {isOpen && loading && results.length === 0 && (
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-8 text-center">
          <Loader2 size={24} className="text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Searching...</p>
        </div>
      )}

      {/* No results state */}
      {isOpen && !loading && query.trim() && results.length === 0 && suggestions.length === 0 && (
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-8 text-center">
          <p className="text-sm text-slate-500">No results found for "{query}"</p>
          {type !== 'all' && (
            <button
              onClick={() => setType('all')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Search in all categories
            </button>
          )}
        </div>
      )}
    </div>
  );
}
