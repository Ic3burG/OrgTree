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

import { useState, useCallback, useMemo } from 'react';

interface ItemWithId {
  id: string;
}

interface BulkSelectionReturn {
  selectionMode: boolean;
  selectedIds: Set<string>;
  selectedArray: string[];
  selectedCount: number;
  hasSelection: boolean;
  allSelected: boolean;
  toggleSelectionMode: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearSelection: () => void;
  toggleSelectAll: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Hook for managing bulk selection state
 * @param items - Array of items with 'id' property
 * @returns Selection state and methods
 */
export function useBulkSelection<T extends ItemWithId>(items: T[] = []): BulkSelectionReturn {
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toggle selection mode - clears selection when exiting
  const toggleSelectionMode = useCallback((): void => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode - clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Enter selection mode
  const enterSelectionMode = useCallback((): void => {
    setSelectionMode(true);
  }, []);

  // Exit selection mode and clear selection
  const exitSelectionMode = useCallback((): void => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Toggle single item selection
  const toggleSelect = useCallback((id: string): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all visible items
  const selectAll = useCallback((): void => {
    const allIds = items.map(item => item.id);
    setSelectedIds(new Set(allIds));
  }, [items]);

  // Deselect all items
  const deselectAll = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  // Clear selection (alias for deselectAll)
  const clearSelection = deselectAll;

  // Check if an item is selected
  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  // Get array of selected IDs
  const selectedArray = useMemo((): string[] => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  // Get selected count
  const selectedCount: number = selectedIds.size;

  // Check if any items are selected
  const hasSelection: boolean = selectedCount > 0;

  // Check if all visible items are selected
  const allSelected = useMemo((): boolean => {
    return items.length > 0 && items.every(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // Toggle select all / deselect all
  const toggleSelectAll = useCallback((): void => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [allSelected, selectAll, deselectAll]);

  return {
    // State
    selectionMode,
    selectedIds,
    selectedArray,
    selectedCount,
    hasSelection,
    allSelected,

    // Methods
    toggleSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelect,
    selectAll,
    deselectAll,
    clearSelection,
    toggleSelectAll,
    isSelected,
  };
}

export default useBulkSelection;
