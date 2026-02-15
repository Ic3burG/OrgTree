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

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSidebar } from './useSidebar';

describe('useSidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSidebar());

    expect(result.current.state).toBe('expanded');
    expect(result.current.width).toBe(256);
    expect(result.current.pinned).toBe(true);
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.isMinimized).toBe(false);
    expect(result.current.isHidden).toBe(false);
  });

  it('should load state from localStorage', () => {
    localStorage.setItem('sidebarState', 'minimized');
    localStorage.setItem('sidebarWidth', '300');
    localStorage.setItem('sidebarPinned', 'false');

    const { result } = renderHook(() => useSidebar());

    expect(result.current.state).toBe('minimized');
    expect(result.current.width).toBe(300);
    expect(result.current.pinned).toBe(false);
  });

  it('should migrate legacy localStorage key', () => {
    localStorage.setItem('adminSidebarCollapsed', 'true');

    const { result } = renderHook(() => useSidebar());

    expect(result.current.state).toBe('minimized');
  });

  it('should update state and persist to localStorage', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      result.current.setState('hidden');
    });

    expect(result.current.state).toBe('hidden');
    expect(localStorage.getItem('sidebarState')).toBe('hidden');
  });

  it('should update width within bounds', () => {
    const { result } = renderHook(() => useSidebar({ minWidth: 200, maxWidth: 400 }));

    act(() => {
      result.current.setWidth(350);
    });
    expect(result.current.width).toBe(350);

    act(() => {
      result.current.setWidth(100); // Too small
    });
    expect(result.current.width).toBe(200); // Min

    act(() => {
      result.current.setWidth(500); // Too large
    });
    expect(result.current.width).toBe(400); // Max
  });

  it('should cycle states correctly', () => {
    const { result } = renderHook(() => useSidebar());

    // expanded -> minimized
    act(() => {
      result.current.cycleState();
    });
    expect(result.current.state).toBe('minimized');

    // minimized -> hidden
    act(() => {
      result.current.cycleState();
    });
    expect(result.current.state).toBe('hidden');

    // hidden -> expanded
    act(() => {
      result.current.cycleState();
    });
    expect(result.current.state).toBe('expanded');
  });

  it('should toggle expanded/hidden', () => {
    const { result } = renderHook(() => useSidebar());

    // expanded -> hidden
    act(() => {
      result.current.toggleExpanded();
    });
    expect(result.current.state).toBe('hidden');

    // hidden -> expanded
    act(() => {
      result.current.toggleExpanded();
    });
    expect(result.current.state).toBe('expanded');
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      result.current.setState('hidden');
      result.current.setWidth(300);
      result.current.setPinned(false);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('expanded');
    expect(result.current.width).toBe(256);
    expect(result.current.pinned).toBe(true);
  });

  it('should handle keyboard shortcuts', () => {
    const { result } = renderHook(() => useSidebar());

    // Mock ctrl+b
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.state).toBe('minimized');

    // Mock ctrl+shift+b
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, shiftKey: true });
      window.dispatchEvent(event);
    });
    expect(result.current.state).toBe('hidden');
  });
});
