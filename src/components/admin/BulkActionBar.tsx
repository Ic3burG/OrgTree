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
import { X, Trash2, FolderInput, Edit3 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  entityType?: 'people' | 'departments';
  onDelete?: () => void;
  onMove?: () => void;
  onEdit?: () => void;
  onCancel: () => void;
}

/**
 * Floating action bar for bulk operations
 */
export default function BulkActionBar({
  selectedCount,
  entityType = 'people',
  onDelete,
  onMove,
  onEdit,
  onCancel,
}: BulkActionBarProps): React.JSX.Element | null {
  if (selectedCount === 0) return null;

  const itemLabel =
    selectedCount === 1
      ? entityType === 'people'
        ? 'person'
        : 'department'
      : entityType === 'people'
        ? 'people'
        : 'departments';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-4 z-50">
      {/* Selected count */}
      <span className="text-sm font-medium min-w-[100px]">
        {selectedCount} {itemLabel} selected
      </span>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-600 dark:bg-slate-500" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Move button (people only) */}
        {entityType === 'people' && onMove && (
          <button
            onClick={onMove}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-700 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-500 rounded-md transition-colors"
          >
            <FolderInput size={16} />
            Move
          </button>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </button>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-600" />

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
      >
        <X size={16} />
        Cancel
      </button>
    </div>
  );
}
