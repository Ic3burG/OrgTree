import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrgMapSettings } from './useOrgMapSettings';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useOrgMapSettings', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key in store) delete store[key];
      }),
      length: 0,
      key: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Ensure global localStorage is also patched if they differ in this env
    (global as unknown as { localStorage: Storage }).localStorage = mockLocalStorage;
  });

  it('should load default settings', () => {
    const { result } = renderHook(() => useOrgMapSettings('org-1'));
    expect(result.current.settings.theme).toBe('slate');
    expect(result.current.settings.layoutDirection).toBe('TB');
    expect(result.current.settings.zoom).toBe(1);
  });

  it('should persist settings to localStorage', async () => {
    const { result } = renderHook(() => useOrgMapSettings('org-1'));

    act(() => {
      result.current.updateSettings({ theme: 'blue' });
    });

    await waitFor(() => {
      const saved = window.localStorage.getItem('orgMap_org-1_settings');
      expect(saved).not.toBeNull();
      if (saved) {
        const parsed = JSON.parse(saved);
        expect(parsed.theme).toBe('blue');
      }
    });
  });

  it('should load saved settings', () => {
    window.localStorage.setItem(
      'orgMap_org-1_settings',
      JSON.stringify({
        theme: 'emerald',
        zoom: 1.5,
      })
    );

    const { result } = renderHook(() => useOrgMapSettings('org-1'));
    expect(result.current.settings.theme).toBe('emerald');
    expect(result.current.settings.zoom).toBe(1.5);
  });

  it('should migrate legacy theme setting', () => {
    window.localStorage.setItem('orgTreeTheme', 'orange');

    const { result } = renderHook(() => useOrgMapSettings('org-1'));
    expect(result.current.settings.theme).toBe('orange');
  });

  it('should reset settings', async () => {
    const { result } = renderHook(() => useOrgMapSettings('org-1'));

    act(() => {
      result.current.updateSettings({ theme: 'violet', zoom: 2 });
    });

    // Wait for save
    await waitFor(() => {
      expect(window.localStorage.getItem('orgMap_org-1_settings')).not.toBeNull();
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.theme).toBe('slate');
    expect(result.current.settings.zoom).toBe(1);
    expect(window.localStorage.getItem('orgMap_org-1_settings')).toBeNull();
  });

  it('should handle undefined orgId', () => {
    const { result } = renderHook(() => useOrgMapSettings(undefined));
    expect(result.current.settings.theme).toBe('slate');

    act(() => {
      result.current.updateSettings({ theme: 'red' });
    });

    // Should update state but not crash
    expect(result.current.settings.theme).toBe('red');

    // Should not save to local storage with undefined key
    expect(window.localStorage.getItem('orgMap_undefined_settings')).toBeNull();
  });
});
