import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, X, Check } from 'lucide-react';
import type { TreeNode } from '../../utils/departmentUtils.js';

interface HierarchicalTreeSelectorProps {
  // Data
  items: TreeNode[];
  value: string | null;
  onChange: (id: string | null) => void;

  // Configuration
  placeholder?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  error?: boolean;
  showBreadcrumb?: boolean;
  defaultExpandedIds?: string[];
  maxHeight?: number;

  // Filtering
  excludeIds?: string[];

  // Styling
  className?: string;
  id?: string;
}

export default function HierarchicalTreeSelector({
  items,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search departments...',
  allowClear = true,
  disabled = false,
  error = false,
  showBreadcrumb = true,
  defaultExpandedIds = [],
  maxHeight = 300,
  excludeIds = [],
  className = '',
  id,
}: HierarchicalTreeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpandedIds));
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items based on search query and excludeIds
  const filteredItems = useMemo(() => {
    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .filter(node => !excludeIds.includes(node.id))
        .map(node => ({
          ...node,
          children: node.children ? filterTree(node.children) : [],
        }))
        .filter(node => {
          const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
          const hasMatchingChildren = node.children && node.children.length > 0;
          return matchesSearch || hasMatchingChildren;
        });
    };
    return filterTree(items);
  }, [items, searchQuery, excludeIds]);

  // Auto-expand parents of matching nodes during search
  useEffect(() => {
    if (searchQuery) {
      const newExpandedIds = new Set<string>();
      const addParents = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            const hasMatchInChildren = (children: TreeNode[]): boolean => {
              return children.some(
                child =>
                  child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (child.children && hasMatchInChildren(child.children))
              );
            };
            if (hasMatchInChildren(node.children)) {
              newExpandedIds.add(node.id);
            }
            addParents(node.children);
          }
        });
      };
      addParents(items);
      setExpandedIds(prev => new Set([...prev, ...newExpandedIds]));
    }
  }, [searchQuery, items]);

  // Get selected item for breadcrumb/display
  const findItemById = React.useCallback((nodes: TreeNode[], targetId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      if (node.children) {
        const found = findItemById(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedItem = useMemo(
    () => (value ? findItemById(items, value) : null),
    [items, value, findItemById]
  );

  const getBreadcrumb = React.useCallback(
    (node: TreeNode): string[] => {
      const path: string[] = [];
      const findPath = (
        currentNodes: TreeNode[],
        targetId: string,
        currentPath: string[]
      ): boolean => {
        for (const currentNode of currentNodes) {
          if (currentNode.id === targetId) {
            path.push(...currentPath, currentNode.name);
            return true;
          }
          if (
            currentNode.children &&
            findPath(currentNode.children, targetId, [...currentPath, currentNode.name])
          ) {
            return true;
          }
        }
        return false;
      };
      findPath(items, node.id, []);
      return path;
    },
    [items]
  );

  const breadcrumbText = useMemo(() => {
    if (!selectedItem) return '';
    return getBreadcrumb(selectedItem).join(' → ');
  }, [selectedItem, getBreadcrumb]);

  const handleToggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newExpandedIds = new Set(expandedIds);
    if (newExpandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }
    setExpandedIds(newExpandedIds);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Keyboard navigation
  const flatVisibleItems = useMemo(() => {
    const flat: { id: string; name: string; hasChildren: boolean; depth: number }[] = [];
    const traverse = (nodes: TreeNode[], depth: number) => {
      nodes.forEach(node => {
        flat.push({ id: node.id, name: node.name, hasChildren: !!node.children?.length, depth });
        if (expandedIds.has(node.id) && node.children) {
          traverse(node.children, depth + 1);
        }
      });
    };
    traverse(filteredItems, 0);
    return flat;
  }, [filteredItems, expandedIds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const currentIndex = flatVisibleItems.findIndex(item => item.id === focusedId);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < flatVisibleItems.length - 1) {
          const nextItem = flatVisibleItems[currentIndex + 1];
          if (nextItem) setFocusedId(nextItem.id);
        } else if (currentIndex === -1 && flatVisibleItems.length > 0) {
          const firstItem = flatVisibleItems[0];
          if (firstItem) setFocusedId(firstItem.id);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevItem = flatVisibleItems[currentIndex - 1];
          if (prevItem) setFocusedId(prevItem.id);
        }
        break;
      case 'ArrowRight':
        if (focusedId) {
          const item = flatVisibleItems.find(i => i.id === focusedId);
          if (item?.hasChildren && !expandedIds.has(focusedId)) {
            setExpandedIds(new Set(expandedIds).add(focusedId));
          }
        }
        break;
      case 'ArrowLeft':
        if (focusedId) {
          if (expandedIds.has(focusedId)) {
            const newExpanded = new Set(expandedIds);
            newExpanded.delete(focusedId);
            setExpandedIds(newExpanded);
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedId) {
          handleSelect(focusedId);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return (
      <ul className="py-1">
        {nodes.map(node => {
          const isSelected = value === node.id;
          const isExpanded = expandedIds.has(node.id);
          const isFocused = focusedId === node.id;
          const hasChildren = !!(node.children && node.children.length > 0);

          return (
            <li key={node.id} className="list-none">
              <div
                className={`
                  flex items-center px-4 py-2 cursor-pointer transition-colors
                  ${isFocused ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                  ${isSelected ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}
                  hover:bg-gray-100 dark:hover:bg-slate-700
                `}
                style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
                onClick={() => handleSelect(node.id)}
                onMouseEnter={() => setFocusedId(node.id)}
              >
                <div
                  className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                  onClick={e => hasChildren && handleToggleExpand(e, node.id)}
                >
                  {hasChildren ? (
                    isExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                </div>
                <span className="flex-1 truncate">{node.name}</span>
                {isSelected && (
                  <Check size={16} className="ml-2 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              {hasChildren && isExpanded && node.children && renderTree(node.children, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className={`relative w-full ${className}`}
      ref={containerRef}
      id={id}
      onKeyDown={handleKeyDown}
    >
      {/* Selector Hub */}
      <div
        className={`
          flex items-center justify-between w-full px-4 py-2 border rounded-lg cursor-pointer transition-all
          ${disabled ? 'bg-gray-50 dark:bg-slate-800 opacity-60 cursor-not-allowed' : 'bg-white dark:bg-slate-700'}
          ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-slate-600'}
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent shadow-md' : 'hover:border-gray-400 dark:hover:border-slate-500'}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {selectedItem ? (
            <div className="flex flex-col">
              {showBreadcrumb && breadcrumbText.includes(' → ') && (
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider truncate mb-0.5">
                  {breadcrumbText.substring(0, breadcrumbText.lastIndexOf(' → '))}
                </span>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                {selectedItem.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-slate-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          {allowClear && selectedItem && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in duration-150"
          style={{ top: '100%' }}
        >
          {/* Search bar */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-lg">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-slate-100"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Tree list */}
          <div className="overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ maxHeight }}>
            {filteredItems.length > 0 ? (
              renderTree(filteredItems)
            ) : (
              <div className="py-8 px-4 text-center">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {searchQuery ? 'No matching departments found' : 'No departments available'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
