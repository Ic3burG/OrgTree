import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOrgMapSettings } from './useOrgMapSettings';

describe('useOrgMapSettings', () => {
  const orgId = 'org-123';
  const settingsKey = `orgMap_${orgId}_settings`;
  const legacyThemeKey = 'orgTreeTheme';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return default settings when no orgId is provided', () => {
    const { result } = renderHook(() => useOrgMapSettings(undefined));

    expect(result.current.settings.theme).toBe('blue');
    expect(result.current.settings.zoom).toBe(1);
    // When no orgId is provided, isLoaded remains false because the effect returns early
    expect(result.current.isLoaded).toBe(false);
  });

  it('should load default settings first', () => {
    const { result } = renderHook(() => useOrgMapSettings(orgId));

    expect(result.current.settings.theme).toBe('blue');
    expect(result.current.settings.layoutDirection).toBe('TB');
  });

  it('should load saved settings from localStorage', () => {
    const savedSettings = {
      theme: 'dark',
      zoom: 1.5,
      layoutDirection: 'LR',
      nodePositionsTB: {},
      nodePositionsLR: { 'node-1': { x: 100, y: 100 } },
    };
    localStorage.setItem(settingsKey, JSON.stringify(savedSettings));

    // Verify storage is set
    expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual(savedSettings);

    const { result } = renderHook(() => useOrgMapSettings(orgId));

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.zoom).toBe(1.5);
    expect(result.current.settings.layoutDirection).toBe('LR');
    expect(result.current.settings.nodePositionsLR).toEqual(savedSettings.nodePositionsLR);
  });

  it('should migrate legacy settings with flat nodePositions', () => {
    const legacySettings = {
      theme: 'orange',
      layoutDirection: 'TB',
      nodePositions: { 'node-1': { x: 50, y: 50 } },
    };
    localStorage.setItem(settingsKey, JSON.stringify(legacySettings));

    const { result } = renderHook(() => useOrgMapSettings(orgId));

    expect(result.current.settings.theme).toBe('orange');
    expect(result.current.settings.nodePositionsTB).toEqual(legacySettings.nodePositions);
    expect(result.current.settings.nodePositionsLR).toEqual({});
    // Should remove legacy field
    expect(
      (result.current.settings as unknown as Record<string, unknown>).nodePositions
    ).toBeUndefined();
  });

  it('should load legacy theme from global key if no specific settings exist', () => {
    localStorage.setItem(legacyThemeKey, 'purple');

    const { result } = renderHook(() => useOrgMapSettings(orgId));

    expect(result.current.settings.theme).toBe('purple');
  });

  it('should update settings', () => {
    const { result } = renderHook(() => useOrgMapSettings(orgId));

    act(() => {
      result.current.updateSettings({ theme: 'green', zoom: 0.8 });
    });

    expect(result.current.settings.theme).toBe('green');
    expect(result.current.settings.zoom).toBe(0.8);
  });

  it('should persist updates to localStorage', () => {
    const { result } = renderHook(() => useOrgMapSettings(orgId));

    act(() => {
      result.current.updateSettings({ theme: 'red' });
    });

    const saved = JSON.parse(localStorage.getItem(settingsKey)!);
    expect(saved.theme).toBe('red');
    expect(localStorage.getItem(legacyThemeKey)).toBe('red');
  });

  it('should reset settings to default but preserve theme', () => {
    const { result } = renderHook(() => useOrgMapSettings(orgId));

    // Change some settings
    act(() => {
      result.current.updateSettings({ theme: 'dark', zoom: 2 });
    });

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.zoom).toBe(2);

    // Reset
    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.zoom).toBe(1); // Default
    expect(result.current.settings.theme).toBe('dark'); // Preserved
  });
});
