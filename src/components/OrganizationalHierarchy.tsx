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

import React from 'react';
import { ChevronRight, Building } from 'lucide-react';
import type { HierarchyLevel } from '../utils/departmentHierarchy';

interface OrganizationalHierarchyProps {
  hierarchy: HierarchyLevel[];
  currentDepartmentId: string;
  onNavigate?: (departmentId: string) => void;
  compact?: boolean;
  showIcons?: boolean;
}

export default function OrganizationalHierarchy({
  hierarchy,
  currentDepartmentId,
  onNavigate,
  compact = false,
  showIcons = true,
}: OrganizationalHierarchyProps): React.JSX.Element {
  if (hierarchy.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">No hierarchy available</p>;
  }

  return (
    <div className="flex items-center flex-wrap gap-2">
      {hierarchy.map((level, index) => {
        const isLast = index === hierarchy.length - 1;
        const isCurrent = level.id === currentDepartmentId;

        return (
          <React.Fragment key={level.id}>
            {/* Department Level */}
            <div
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md transition-all
                ${
                  isCurrent
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }
                ${
                  onNavigate && !isCurrent
                    ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600'
                    : ''
                }
              `}
              onClick={() => onNavigate && !isCurrent && onNavigate(level.id)}
              title={level.name}
            >
              {showIcons && (
                <Building
                  size={14}
                  className={
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                />
              )}
              <span className={`text-sm ${compact ? 'max-w-[100px]' : 'max-w-[150px]'} truncate`}>
                {level.name}
              </span>
              {isCurrent && <span className="text-xs opacity-75 ml-1">(current)</span>}
            </div>

            {/* Separator */}
            {!isLast && (
              <ChevronRight
                size={16}
                className="text-slate-400 dark:text-slate-500 flex-shrink-0"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
