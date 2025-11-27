import { useState, useEffect, useMemo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import DepartmentCard from './DepartmentCard';
import SearchBar from './SearchBar';
import Breadcrumbs from './Breadcrumbs';
import DetailPanel from './DetailPanel';
import { parseCSV, getAllPaths } from '../utils/parseCSV';
import { filterTree, highlightMatch } from '../utils/filterTree';

/**
 * Directory - Main container component
 * Manages state for the entire organization tree
 */
export default function Directory() {
  const [treeData, setTreeData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState('/');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load CSV data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const response = await fetch('/src/data/sample-org.csv');
        if (!response.ok) {
          throw new Error('Failed to load organization data');
        }
        const csvText = await response.text();
        const parsed = parseCSV(csvText);
        setTreeData(parsed);

        // Auto-expand first level
        const firstLevelPaths = parsed.map(node => node.path);
        setExpandedNodes(new Set(firstLevelPaths));
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter tree based on search query
  const { displayTree, autoExpandPaths } = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return { displayTree: treeData, autoExpandPaths: [] };
    }

    const { filteredNodes, expandedPaths } = filterTree(treeData, searchQuery);

    // Add highlighting to matching nodes
    const highlightNodes = (nodes) => {
      return nodes.map(node => {
        const highlighted = { ...node };

        if (node.isMatch) {
          highlighted.highlightedName = highlightMatch(node.name, searchQuery);
          if (node.title) {
            highlighted.highlightedTitle = highlightMatch(node.title, searchQuery);
          }
        }

        if (node.children && node.children.length > 0) {
          highlighted.children = highlightNodes(node.children);
        }

        return highlighted;
      });
    };

    return {
      displayTree: highlightNodes(filteredNodes),
      autoExpandPaths: Array.from(expandedPaths)
    };
  }, [treeData, searchQuery]);

  // Auto-expand nodes when search matches
  useEffect(() => {
    if (autoExpandPaths.length > 0) {
      setExpandedNodes(prev => new Set([...prev, ...autoExpandPaths]));
    }
  }, [searchQuery]); // Only run when search query changes, not on every autoExpandPaths reference change

  // Toggle single node expansion
  const toggleNode = (path) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Expand all departments
  const expandAll = () => {
    const allDeptPaths = getAllPaths(treeData, 'department');
    setExpandedNodes(new Set(allDeptPaths));
  };

  // Collapse all departments
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Handle search query change
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      // Reset to first-level expansion when clearing search
      const firstLevelPaths = treeData.map(node => node.path);
      setExpandedNodes(new Set(firstLevelPaths));
    }
  };

  // Select person for detail panel
  const selectPerson = (person) => {
    setSelectedPerson(person);
  };

  // Close detail panel
  const closeDetailPanel = () => {
    setSelectedPerson(null);
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (path) => {
    setBreadcrumbPath(path);
    // Could implement filtered view based on path
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organization directory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <p className="text-red-800 font-semibold mb-2">Error Loading Directory</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Organization Directory
          </h1>
          <p className="text-slate-600">
            Browse departments and contact information
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar value={searchQuery} onChange={handleSearch} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300
                rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
              aria-label="Expand all departments"
            >
              <Maximize2 size={16} />
              Expand All
            </button>

            <button
              onClick={collapseAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300
                rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
              aria-label="Collapse all departments"
            >
              <Minimize2 size={16} />
              Collapse All
            </button>
          </div>

          {searchQuery && (
            <div className="text-sm text-slate-600">
              Showing search results for <span className="font-semibold">"{searchQuery}"</span>
            </div>
          )}
        </div>

        {/* Breadcrumbs */}
        {breadcrumbPath !== '/' && (
          <Breadcrumbs path={breadcrumbPath} onNavigate={handleBreadcrumbNavigate} />
        )}

        {/* Tree */}
        <div className="space-y-2" role="tree" aria-label="Organization tree">
          {displayTree.length > 0 ? (
            displayTree.map(node => {
              if (node.type === 'department') {
                return (
                  <DepartmentCard
                    key={node.path}
                    department={node}
                    isExpanded={expandedNodes.has(node.path)}
                    onToggle={toggleNode}
                    expandedNodes={expandedNodes}
                    onPersonSelect={selectPerson}
                    searchQuery={searchQuery}
                  />
                );
              }
              return null;
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-600">
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : 'No organization data available'}
              </p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <DetailPanel person={selectedPerson} onClose={closeDetailPanel} />
      </div>
    </div>
  );
}
