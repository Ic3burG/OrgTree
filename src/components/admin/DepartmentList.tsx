import React, { useCallback } from 'react';
import { Loader2, CheckSquare, Square } from 'lucide-react';
import DepartmentItem, { type DepartmentWithDepth } from './DepartmentItem';
import type { Department, SearchResult } from '../../types/index.js';

interface DepartmentListProps {
  loading: boolean;
  departments: DepartmentWithDepth[] | Department[]; // Tree or Flat list
  isSearching: boolean;
  searchQuery: string;
  hasSelection: boolean;
  selectedCount: number;
  selectionMode: boolean;
  allSelected: boolean;
  toggleSelectAll: () => void;
  // Item props
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  isRecentlyChanged: (id: string) => boolean;
  // Search specific
  searchResults?: SearchResult[];
}

export default function DepartmentList({
  loading,
  departments,
  isSearching,
  searchQuery,
  hasSelection,
  selectedCount,
  selectionMode,
  allSelected,
  toggleSelectAll,
  expanded,
  toggleExpand,
  isSelected,
  toggleSelect,
  onEdit,
  onDelete,
  isRecentlyChanged,
  searchResults = [],
}: DepartmentListProps): React.JSX.Element {
  // Recursive renderer for the tree
  const renderTreeItem = useCallback(
    (dept: DepartmentWithDepth): React.JSX.Element => {
      const hasChildren = dept.children && dept.children.length > 0;
      const isExpanded = expanded.has(dept.id);

      return (
        <div key={dept.id}>
          <DepartmentItem
            dept={dept}
            isExpanded={isExpanded}
            onToggleExpand={toggleExpand}
            selectionMode={selectionMode}
            isSelected={isSelected(dept.id)}
            onToggleSelect={toggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            isRecentlyChanged={isRecentlyChanged(dept.id)}
          />
          {hasChildren && isExpanded && !selectionMode && (
            <div>{dept.children!.map(renderTreeItem)}</div>
          )}
        </div>
      );
    },
    [
      expanded,
      toggleExpand,
      selectionMode,
      isSelected,
      toggleSelect,
      onEdit,
      onDelete,
      isRecentlyChanged,
    ]
  );

  const renderFlatItem = useCallback(
    (dept: Department | SearchResult) => {
      // Cast to DepartmentWithDepth with 0 depth for flat list
      const flatDept: DepartmentWithDepth = {
        ...(dept as Department),
        depth: 0,
        children: [],
      };

      return (
        <div key={dept.id}>
          <DepartmentItem
            dept={flatDept}
            isExpanded={false}
            onToggleExpand={() => {}}
            selectionMode={selectionMode}
            isSelected={isSelected(dept.id)}
            onToggleSelect={toggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            isRecentlyChanged={isRecentlyChanged(dept.id)}
          />
        </div>
      );
    },
    [selectionMode, isSelected, toggleSelect, onEdit, onDelete, isRecentlyChanged]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 pb-8 min-h-0">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        {/* Select All header in selection mode */}
        {selectionMode && (departments.length > 0 || searchResults.length > 0) && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {allSelected ? (
                <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
              ) : (
                <Square size={18} />
              )}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {hasSelection && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ({selectedCount} selected)
              </span>
            )}
          </div>
        )}

        <div className="p-2">
          {isSearching ? (
            searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <p>No departments found for "{searchQuery}"</p>
                <p className="text-sm mt-2">Try a different search term</p>
              </div>
            ) : (
              searchResults.map(renderFlatItem)
            )
          ) : selectionMode ? (
            // Flat list for selection mode (using departments prop assuming it's the full flat list if searching is off)
            // Note: In DepartmentManager, 'departments' is flat list. 'tree' is recursive.
            // We need to handle both cases. If selectionMode is on, we likely want the flat list.
            (departments as Department[]).map(renderFlatItem)
          ) : // Tree view
          (departments as DepartmentWithDepth[]).length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No departments yet. Click "Add Department" to create one.
            </div>
          ) : (
            (departments as DepartmentWithDepth[]).map(renderTreeItem)
          )}
        </div>
      </div>
    </div>
  );
}
