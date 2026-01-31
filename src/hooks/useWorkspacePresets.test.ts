import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWorkspacePresets, WorkspaceConfig } from './useWorkspacePresets';

describe('useWorkspacePresets', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default presets', () => {
    const { result } = renderHook(() => useWorkspacePresets());

    expect(result.current.presets).toHaveLength(3);
    expect(result.current.presets.map(p => p.id)).toEqual(['default', 'compact', 'focus']);
  });

  it('should save a new preset', () => {
    const { result } = renderHook(() => useWorkspacePresets());
    const config: WorkspaceConfig = {
      sidebarState: 'expanded',
      sidebarWidth: 300,
      sidebarPinned: false,
    };

    act(() => {
      result.current.savePreset('My Preset', config);
    });

    expect(result.current.presets).toHaveLength(4);
    expect(result.current.presets[3].name).toBe('My Preset');
    expect(result.current.activePresetId).toBe(result.current.presets[3].id);
  });

  it('should delete a custom preset', () => {
    const { result } = renderHook(() => useWorkspacePresets());
    const config: WorkspaceConfig = {
      sidebarState: 'expanded',
      sidebarWidth: 300,
      sidebarPinned: false,
    };

    let newId = '';
    act(() => {
      result.current.savePreset('Temp', config);
    });
    newId = result.current.presets[3].id;

    act(() => {
      result.current.deletePreset(newId);
    });

    expect(result.current.presets).toHaveLength(3);
    expect(result.current.activePresetId).toBeNull();
  });

  it('should NOT delete default presets', () => {
    const { result } = renderHook(() => useWorkspacePresets());

    act(() => {
      result.current.deletePreset('default');
    });

    expect(result.current.presets).toHaveLength(3);
    expect(result.current.presets.find(p => p.id === 'default')).toBeDefined();
  });

  it('should apply a preset and return config', () => {
    const { result } = renderHook(() => useWorkspacePresets());

    let config: WorkspaceConfig | null = null;
    act(() => {
      config = result.current.applyPreset('compact');
    });

    expect(config).toEqual({
      sidebarState: 'minimized',
      sidebarWidth: 64,
      sidebarPinned: true,
    });
    expect(result.current.activePresetId).toBe('compact');
  });
});
