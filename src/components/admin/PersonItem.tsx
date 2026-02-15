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

import React, { memo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mail,
  Phone,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Star,
  GitBranch,
  ChevronUp,
} from 'lucide-react';
import type { Person, CustomFieldDefinition, Department } from '../../types/index.js';
import OrganizationalHierarchy from '../OrganizationalHierarchy';
import { buildHierarchyChain } from '../../utils/departmentHierarchy';

export interface PersonWithDepartmentName extends Person {
  departmentName?: string;
}

interface PersonItemProps {
  person: PersonWithDepartmentName;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (person: PersonWithDepartmentName) => void;
  onDelete: (person: PersonWithDepartmentName) => void;
  isRecentlyChanged: boolean;
  fieldDefinitions?: CustomFieldDefinition[];
  departments?: Department[];
}

const PersonItem = memo(function PersonItem({
  person,
  selectionMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  isRecentlyChanged,
  fieldDefinitions = [],
  departments = [],
}: PersonItemProps): React.JSX.Element {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState(false);

  // Build hierarchy chain if departments are available
  const hierarchy =
    departments.length > 0 ? buildHierarchyChain(person.department_id, departments) : [];

  // Filter out empty custom fields and map to their definitions
  const activeCustomFields = fieldDefinitions
    .filter(def => person.custom_fields && person.custom_fields[def.field_key])
    .map(def => ({
      definition: def,
      value: person.custom_fields![def.field_key],
    }));

  // Navigate to org map with person highlighted
  const handlePersonNameClick = (e: React.MouseEvent) => {
    if (selectionMode) return;
    e.stopPropagation();
    navigate(`/org/${orgId}/map?personId=${person.id}`);
  };

  // Navigate to org map with department highlighted
  const handleDepartmentNavigate = (departmentId: string) => {
    navigate(`/org/${orgId}/map?departmentId=${departmentId}`);
  };

  return (
    <div
      onClick={selectionMode ? () => onToggleSelect(person.id) : undefined}
      className={`p-6 transition-all duration-300 group ${selectionMode ? 'cursor-pointer' : ''} ${
        isRecentlyChanged
          ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700'
          : ''
      } ${
        selectionMode && isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox in selection mode */}
        {selectionMode && (
          <div className="pt-1">
            {isSelected ? (
              <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Square size={20} className="text-gray-400 dark:text-slate-500" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate flex items-center gap-2">
              <button
                onClick={handlePersonNameClick}
                className={`text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                  selectionMode ? 'cursor-default' : 'cursor-pointer'
                }`}
                disabled={selectionMode}
                title="View on Org Map"
              >
                {person.name}
              </button>
              {person.is_starred && (
                <Star size={16} className="text-amber-400 flex-shrink-0" fill="currentColor" />
              )}
            </h3>
            {person.departmentName && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded whitespace-nowrap">
                {person.departmentName}
              </span>
            )}

            {/* Show hierarchy toggle if hierarchy is available */}
            {hierarchy.length > 1 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsHierarchyExpanded(!isHierarchyExpanded);
                }}
                className={`p-1 rounded-md transition-colors ${
                  isHierarchyExpanded
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'text-gray-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400'
                }`}
                title={isHierarchyExpanded ? 'Hide reporting chain' : 'Show reporting chain'}
              >
                <GitBranch size={16} />
              </button>
            )}
          </div>

          {/* Expanded Hierarchy View */}
          {isHierarchyExpanded && hierarchy.length > 1 && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Reporting Chain
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setIsHierarchyExpanded(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <ChevronUp size={14} />
                </button>
              </div>
              <OrganizationalHierarchy
                hierarchy={hierarchy}
                currentDepartmentId={person.department_id}
                onNavigate={handleDepartmentNavigate}
                compact={false}
                showIcons={true}
              />
            </div>
          )}

          {person.title && (
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 truncate">
              {person.title}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-slate-400 mb-4">
            {person.email && (
              <div className="flex items-center gap-2 max-w-full">
                <Mail size={16} className="flex-shrink-0" />
                <a
                  href={`mailto:${person.email}`}
                  className="hover:text-blue-600 truncate"
                  onClick={e => selectionMode && e.preventDefault()}
                >
                  {person.email}
                </a>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <span>{person.phone}</span>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {activeCustomFields.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t border-gray-100 dark:border-slate-700">
              {activeCustomFields.map(({ definition, value }) => (
                <div key={definition.id} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    {definition.name}:
                  </span>
                  <span className="text-sm text-gray-700 dark:text-slate-300 truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions - hide in selection mode */}
        {!selectionMode && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(person);
              }}
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Edit person"
              aria-label={`Edit ${person.name}`}
            >
              <Edit size={18} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(person);
              }}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete person"
              aria-label={`Delete ${person.name}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PersonItem;
