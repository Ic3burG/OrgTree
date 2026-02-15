/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import React, { memo, useRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
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
import type { Department, CustomFieldDefinition } from '../../types/index.js';

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
  fieldDefinitions?: CustomFieldDefinition[];
  activePeoplePopupId: string | null;
  onPeoplePopupChange: React.Dispatch<React.SetStateAction<string | null>>;
}

const HIDE_DELAY_MS = 300;

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
  fieldDefinitions = [],
  activePeoplePopupId,
  onPeoplePopupChange,
}: DepartmentItemProps): React.JSX.Element {
  const hasChildren = dept.children && dept.children.length > 0;
  const peopleCount = dept.people?.length || 0;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; below: boolean } | null>(
    null
  );
  const showPeople = activePeoplePopupId === dept.id;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearHideTimeout();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const below = rect.top < 250;
      setPopupPos({
        top: below ? rect.bottom + 8 : rect.top - 8,
        left: rect.left,
        below,
      });
    }
    onPeoplePopupChange(dept.id);
  }, [clearHideTimeout, onPeoplePopupChange, dept.id]);

  const handleMouseLeave = useCallback(() => {
    clearHideTimeout();
    const myId = dept.id;
    hideTimeoutRef.current = setTimeout(() => {
      // Only close if this department is still the active popup
      onPeoplePopupChange(prev => (prev === myId ? null : prev));
    }, HIDE_DELAY_MS);
  }, [clearHideTimeout, onPeoplePopupChange, dept.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearHideTimeout();
  }, [clearHideTimeout]);

  // Filter out empty custom fields and map to their definitions
  const activeCustomFields = fieldDefinitions
    .filter(def => dept.custom_fields && dept.custom_fields[def.field_key])
    .map(def => ({
      definition: def,
      value: dept.custom_fields![def.field_key],
    }));

  return (
    <div
      onClick={selectionMode ? () => onToggleSelect(dept.id) : undefined}
      className={`flex flex-col rounded-lg group transition-all duration-300 ${
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
    >
      <div
        className="flex items-center gap-2 p-3"
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
          <span
            ref={triggerRef}
            className="ml-2 relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Link
              to={`/org/${dept.organization_id}/map?departmentId=${dept.id}`}
              className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline decoration-blue-600/30 underline-offset-2"
              onClick={e => e.stopPropagation()}
            >
              <Users size={14} className="inline mr-1" />
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
            </Link>
          </span>
          {showPeople &&
            peopleCount > 0 &&
            popupPos &&
            createPortal(
              <div
                className="fixed z-[9999] w-56 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                style={{
                  left: popupPos.left,
                  ...(popupPos.below
                    ? { top: popupPos.top }
                    : { bottom: window.innerHeight - popupPos.top }),
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 text-xs font-medium text-slate-500 dark:text-slate-400">
                  People in {dept.name}
                </div>
                <div className="p-1 max-h-48 overflow-y-auto">
                  {dept.people?.map(person => (
                    <Link
                      key={person.id}
                      to={`/org/${dept.organization_id}/map?personId=${person.id}`}
                      className="block px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {person.name}
                      {person.title && (
                        <span className="block text-xs text-slate-400 font-normal truncate">
                          {person.title}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>,
              document.body
            )}
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

      {/* Custom Fields - only show if expanded or it's a flat list (search result/selection) */}
      {activeCustomFields.length > 0 && (isExpanded || selectionMode || dept.depth === 0) && (
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 pb-3 pt-1 px-3 ml-12"
          style={{ paddingLeft: `${dept.depth * 24 + 12 + 28}px` }}
        >
          {activeCustomFields.map(({ definition, value }) => (
            <div key={definition.id} className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                {definition.name}:
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default DepartmentItem;
