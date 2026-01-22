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
