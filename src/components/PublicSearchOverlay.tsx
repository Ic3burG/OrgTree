import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Filter, Star } from 'lucide-react';
import { usePublicSearch } from '../hooks/usePublicSearch';
import type { Department, SearchResult } from '../types/index';
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

interface PublicSearchOverlayProps {
  departments: Department[];
  onSelectResult?: (result: TransformedSearchResult) => void;
}

/**
 * PublicSearchOverlay - Client-side search for public organization views
 * Filters loaded departments and people without making API calls
 */
export default function PublicSearchOverlay({
  departments,
  onSelectResult,
}: PublicSearchOverlayProps): React.JSX.Element {
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
    total,
    clearSearch,
  } = usePublicSearch(departments, { debounceMs: 300, minQueryLength: 1 });

  // Open dropdown when we have results
  useEffect(() => {
    if (query.trim() && results.length > 0) {
      setIsOpen(true);
    } else if (!query.trim()) {
      setIsOpen(false);
    }
  }, [query, results]);

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
        // For people, nodeId is the departmentId
        nodeId: result.type === 'department' ? result.id : result.department_id || result.id,
        departmentName: result.department_name ?? undefined,
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
          <Search size={22} className="lg:w-5 lg:h-5 text-slate-400" />
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
      {isOpen && suggestions.length > 0 && results.length === 0 && (
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
                <div className="flex items-center gap-1.5">
                  <div className="font-medium text-base lg:text-sm text-slate-900 dark:text-slate-100 truncate">
                    {result.name}
                  </div>
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

      {/* No results state */}
      {isOpen && query.trim() && results.length === 0 && suggestions.length === 0 && (
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
