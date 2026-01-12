import React, { memo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Building2,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { Department } from '../../types/index.js';

// Interface that matches the structure used in DepartmentManager's buildTree
export interface DepartmentWithDepth extends Department {
  depth: number;
  children?: DepartmentWithDepth[];
}

interface DepartmentItemProps {
  dept: DepartmentWithDepth;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  isRecentlyChanged?: boolean;
}

const DepartmentItem = memo(function DepartmentItem({
  dept,
  isExpanded,
  onToggleExpand,
  selectionMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  isRecentlyChanged = false,
}: DepartmentItemProps): React.JSX.Element {
  const hasChildren = dept.children && dept.children.length > 0;
  const peopleCount = dept.people?.length || 0;

  return (
    <div
      onClick={selectionMode ? () => onToggleSelect(dept.id) : undefined}
      className={`flex items-center gap-2 p-3 rounded-lg group transition-all duration-300 ${
        selectionMode ? 'cursor-pointer' : ''
      } ${
        isRecentlyChanged
          ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700'
          : ''
      } ${
        selectionMode && isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
      style={{ paddingLeft: `${dept.depth * 24 + 12}px` }}
    >
      {/* Checkbox in selection mode */}
      {selectionMode && (
        <div className="flex-shrink-0">
          {isSelected ? (
            <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
          ) : (
            <Square size={18} className="text-slate-400 dark:text-slate-500" />
          )}
        </div>
      )}

      {!selectionMode && (
        <button
          onClick={e => {
            e.stopPropagation();
            onToggleExpand(dept.id);
          }}
          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${
            hasChildren ? '' : 'invisible'
          }`}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronRight size={16} className="text-slate-400 dark:text-slate-500" />
          )}
        </button>
      )}

      <Building2 size={18} className="text-slate-400 dark:text-slate-500" />

      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-800 dark:text-slate-100">{dept.name}</span>
        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Users size={14} className="inline mr-1" />
          {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
        </span>
        {/* Helper text for flat view (search results) if needed in future */}
        {dept.parent_id && !selectionMode && dept.depth === 0 && (
          <span className="ml-2 text-xs text-green-600 dark:text-green-400 hidden sm:inline">
            (has parent)
          </span>
        )}
      </div>

      {/* Actions - hide in selection mode */}
      {!selectionMode && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onEdit(dept);
            }}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            title="Edit"
            aria-label={`Edit ${dept.name}`}
          >
            <Pencil size={16} className="text-slate-500 dark:text-slate-400" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(dept);
            }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
            title="Delete"
            aria-label={`Delete ${dept.name}`}
          >
            <Trash2 size={16} className="text-red-500 dark:text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
});

export default DepartmentItem;
