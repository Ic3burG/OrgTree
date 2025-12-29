import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing bulk selection state
 * @param {Array} items - Array of items with 'id' property
 * @returns {Object} Selection state and methods
 */
export function useBulkSelection(items = []) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Toggle selection mode - clears selection when exiting
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode - clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Enter selection mode
  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  // Exit selection mode and clear selection
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Toggle single item selection
  const toggleSelect = useCallback((id) => {
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
  const selectAll = useCallback(() => {
    const allIds = items.map(item => item.id);
    setSelectedIds(new Set(allIds));
  }, [items]);

  // Deselect all items
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Clear selection (alias for deselectAll)
  const clearSelection = deselectAll;

  // Check if an item is selected
  const isSelected = useCallback((id) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Get array of selected IDs
  const selectedArray = useMemo(() => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  // Get selected count
  const selectedCount = selectedIds.size;

  // Check if any items are selected
  const hasSelection = selectedCount > 0;

  // Check if all visible items are selected
  const allSelected = useMemo(() => {
    return items.length > 0 && items.every(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // Toggle select all / deselect all
  const toggleSelectAll = useCallback(() => {
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
