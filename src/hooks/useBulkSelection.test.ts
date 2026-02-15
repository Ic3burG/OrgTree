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

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkSelection } from './useBulkSelection';

describe('useBulkSelection', () => {
  const mockItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ];

  describe('initial state', () => {
    it('should start with selection mode off', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));
      expect(result.current.selectionMode).toBe(false);
    });

    it('should start with no selections', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() => useBulkSelection([]));
      expect(result.current.allSelected).toBe(false);
    });
  });

  describe('toggleSelectionMode', () => {
    it('should toggle selection mode on', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelectionMode();
      });

      expect(result.current.selectionMode).toBe(true);
    });

    it('should toggle selection mode off and clear selection', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      // Enter selection mode and select items
      act(() => {
        result.current.toggleSelectionMode();
        result.current.toggleSelect('1');
        result.current.toggleSelect('2');
      });

      expect(result.current.selectedCount).toBe(2);

      // Exit selection mode
      act(() => {
        result.current.toggleSelectionMode();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('toggleSelect', () => {
    it('should select an item', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelect('1');
      });

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should deselect an item when toggled again', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelect('1');
        result.current.toggleSelect('1');
      });

      expect(result.current.isSelected('1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should select multiple items', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelect('1');
        result.current.toggleSelect('2');
      });

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('2')).toBe(true);
      expect(result.current.selectedCount).toBe(2);
    });
  });

  describe('selectAll', () => {
    it('should select all items', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.allSelected).toBe(true);
    });
  });

  describe('deselectAll', () => {
    it('should deselect all items', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.selectAll();
        result.current.deselectAll();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('toggleSelectAll', () => {
    it('should select all when none are selected', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.allSelected).toBe(true);
    });

    it('should deselect all when all are selected', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      // First select all
      act(() => {
        result.current.selectAll();
      });

      expect(result.current.allSelected).toBe(true);

      // Then toggle to deselect
      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should select all when only some are selected', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelect('1');
        result.current.toggleSelectAll();
      });

      expect(result.current.allSelected).toBe(true);
    });
  });

  describe('selectedArray', () => {
    it('should return array of selected IDs', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.toggleSelect('1');
        result.current.toggleSelect('3');
      });

      expect(result.current.selectedArray).toContain('1');
      expect(result.current.selectedArray).toContain('3');
      expect(result.current.selectedArray).not.toContain('2');
    });
  });

  describe('exitSelectionMode', () => {
    it('should exit selection mode and clear selection', () => {
      const { result } = renderHook(() => useBulkSelection(mockItems));

      act(() => {
        result.current.enterSelectionMode();
        result.current.toggleSelect('1');
        result.current.exitSelectionMode();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('items update', () => {
    it('should update allSelected when items change', () => {
      const { result, rerender } = renderHook(({ items }) => useBulkSelection(items), {
        initialProps: { items: mockItems },
      });

      // Select all current items
      act(() => {
        result.current.selectAll();
      });

      expect(result.current.allSelected).toBe(true);

      // Add a new item
      const newItems = [...mockItems, { id: '4', name: 'Item 4' }];
      rerender({ items: newItems });

      // allSelected should now be false because item 4 is not selected
      expect(result.current.allSelected).toBe(false);
    });
  });
});
