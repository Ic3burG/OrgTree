import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, User } from 'lucide-react';

/**
 * SearchOverlay - Floating search bar with dropdown results
 * Mobile: Positioned below top nav with larger touch targets
 * Desktop: Positioned at top-center of canvas
 */
export default function SearchOverlay({ nodes, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      const matches = searchNodesAndPeople(nodes, query);
      setResults(matches);
      setIsOpen(matches.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, nodes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleSelectResult = (result) => {
    setIsOpen(false);
    if (onSelectResult) {
      onSelectResult(result);
    }
  };

  return (
    <div ref={searchRef} className="absolute top-16 lg:top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 lg:pl-3 flex items-center pointer-events-none">
          <Search size={22} className="lg:w-5 lg:h-5 text-slate-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search departments and people..."
          className="w-full pl-11 lg:pl-10 pr-11 lg:pr-10 py-3 lg:py-2.5 bg-white/95 backdrop-blur-sm border border-slate-300
            rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            focus:border-transparent text-slate-900 placeholder-slate-400 text-base lg:text-sm
            touch-manipulation"
          aria-label="Search organization"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400
              hover:text-slate-600 transition-colors touch-manipulation"
            aria-label="Clear search"
          >
            <X size={22} className="lg:w-5 lg:h-5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="mt-2 bg-white rounded-lg shadow-xl border border-slate-200 max-h-[60vh] lg:max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}-${index}`}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-4 lg:py-3 flex items-center gap-3 hover:bg-slate-50
                active:bg-slate-100 transition-colors text-left border-b border-slate-100 last:border-b-0
                touch-manipulation"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {result.type === 'department' ? (
                  <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users size={22} className="lg:w-5 lg:h-5 text-slate-600" />
                  </div>
                ) : (
                  <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                    flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(result.name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <div className="font-medium text-base lg:text-sm text-slate-900 truncate">
                  {result.name}
                </div>
                <div className="text-sm lg:text-sm text-slate-600 truncate">
                  {result.subtitle}
                  {result.type === 'person' && result.departmentName && (
                    <span className="text-slate-400"> · {result.departmentName}</span>
                  )}
                </div>
              </div>

              {/* Type Badge */}
              <div className="flex-shrink-0">
                <span className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${result.type === 'department'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-blue-100 text-blue-700'
                  }
                `}>
                  {result.type === 'department' ? 'Dept' : 'Person'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper functions
function searchNodesAndPeople(nodes, query) {
  if (!query || query.trim() === '') return [];

  const lowerQuery = query.toLowerCase();
  const matches = [];

  nodes.forEach(node => {
    // Check department name
    if (node.data.name.toLowerCase().includes(lowerQuery)) {
      matches.push({
        type: 'department',
        id: node.id,
        name: node.data.name,
        subtitle: `${node.data.people.length} people`,
        nodeId: node.id
      });
    }

    // Check people in this department
    node.data.people?.forEach(person => {
      const nameMatch = person.name.toLowerCase().includes(lowerQuery);
      const titleMatch = person.title && person.title.toLowerCase().includes(lowerQuery);
      const emailMatch = person.email && person.email.toLowerCase().includes(lowerQuery);

      if (nameMatch || titleMatch || emailMatch) {
        matches.push({
          type: 'person',
          id: person.id,
          name: person.name,
          subtitle: person.title,
          person: person,
          nodeId: node.id,
          departmentName: node.data.name
        });
      }
    });
  });

  return matches;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
