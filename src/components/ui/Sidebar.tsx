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
import { ChevronsLeft, ChevronsRight, Pin, PinOff } from 'lucide-react';
import { useResizable } from '../../hooks/useResizable';
import SidebarResizeHandle from './SidebarResizeHandle';
import FloatingActionButton from './FloatingActionButton';
import { SidebarState } from '../../hooks/useSidebar';

interface SidebarProps {
  // State
  state: SidebarState;
  width: number;
  pinned: boolean;

  // Actions
  onStateChange: (state: SidebarState) => void;
  onWidthChange: (width: number) => void;
  onPinnedChange: (pinned: boolean) => void;

  // Content
  header?: React.ReactNode;
  navigation: React.ReactNode;
  footer?: React.ReactNode;

  // Config
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  className?: string;
}

export default function Sidebar({
  state,
  width,
  pinned,
  onStateChange,
  onWidthChange,
  onPinnedChange,
  header,
  navigation,
  footer,
  minWidth = 200,
  maxWidth = 400,
  className = '',
}: SidebarProps): React.JSX.Element {
  // Resize logic
  const {
    handleMouseDown,
    isResizing,
    width: currentWidth,
  } = useResizable({
    minWidth,
    maxWidth,
    initialWidth: width,
    onResize: _w => {
      // Optional: Update width in real-time if needed, but usually handled by hook
    },
    onResizeEnd: onWidthChange,
  });

  const handleToggleCollapse = () => {
    if (state === 'expanded') {
      onStateChange('minimized');
    } else {
      onStateChange('expanded');
    }
  };

  // Determine actual width to render
  const renderWidth =
    state === 'hidden' ? 0 : state === 'minimized' ? 64 : isResizing ? currentWidth : width;
  const isExpanded = state === 'expanded';
  const isHidden = state === 'hidden';

  return (
    <>
      <aside
        className={`relative flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transition-[width] duration-300 ease-in-out ${className} ${
          isResizing ? 'transition-none select-none' : ''
        }`}
        style={{ width: renderWidth, overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="flex flex-col min-h-[4rem] h-auto border-b border-gray-200 dark:border-slate-700 shrink-0 relative">
          {/* Controls - Absolute positioned for expanded, relative for minimized */}
          <div
            className={`absolute top-4 right-4 z-10 flex items-center gap-1 ${!isExpanded ? 'static justify-center w-full mb-4' : ''}`}
          >
            {isExpanded && (
              <button
                onClick={() => onPinnedChange(!pinned)}
                className={`p-1.5 rounded-md transition-colors ${
                  pinned
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title={pinned ? 'Unpin sidebar (auto-collapse on navigate)' : 'Pin sidebar'}
              >
                {pinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
            )}

            <button
              onClick={handleToggleCollapse}
              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isExpanded ? 'Minimize sidebar' : 'Expand sidebar'}
            >
              {isExpanded ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
            </button>
          </div>

          {/* Header Content */}
          <div className="p-4 pt-4">{header}</div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navigation}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`border-t border-gray-200 dark:border-slate-700 shrink-0 ${
              isExpanded ? 'p-4' : 'px-0 py-4'
            }`}
          >
            <div className={`${!isExpanded ? 'flex justify-center' : ''}`}>{footer}</div>
          </div>
        )}

        {/* Resize Handle */}
        {isExpanded && (
          <SidebarResizeHandle onMouseDown={handleMouseDown} isResizing={isResizing} />
        )}
      </aside>

      {/* Floating Action Button for Hidden State */}
      <FloatingActionButton visible={isHidden} onClick={() => onStateChange('expanded')} />
    </>
  );
}
