import { useState, useEffect, useCallback } from 'react';
import { Viewport } from 'reactflow';

export interface OrgMapSettings {
  theme: string;
  zoom: number;
  viewport: Viewport;
  nodePositionsTB: Record<string, { x: number; y: number }>;
  nodePositionsLR: Record<string, { x: number; y: number }>;
  expandedNodes: string[];
  layoutDirection: 'TB' | 'LR';
}

const DEFAULT_SETTINGS: OrgMapSettings = {
  theme: 'blue',
  zoom: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodePositionsTB: {},
  nodePositionsLR: {},
  expandedNodes: [],
  layoutDirection: 'TB',
};

// Legacy interface for migration
interface LegacySettings {
  nodePositions?: Record<string, { x: number; y: number }>;
  [key: string]: unknown;
}

export function useOrgMapSettings(orgId: string | undefined) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Use a function to initialize state so it only runs once and can read from localStorage
  const [settings, setSettings] = useState<OrgMapSettings>(() => {
    if (!orgId) return DEFAULT_SETTINGS;

    const storageKey = `orgMap_${orgId}_settings`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LegacySettings;

        // Migrate legacy flat nodePositions if present
        if (parsed.nodePositions && !parsed.nodePositionsTB && !parsed.nodePositionsLR) {
          // Assume legacy positions belong to the saved layout direction (or TB if missing)
          const direction = (parsed.layoutDirection as 'TB' | 'LR') || 'TB';
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            nodePositionsTB: direction === 'TB' ? parsed.nodePositions : {},
            nodePositionsLR: direction === 'LR' ? parsed.nodePositions : {},
            // Remove legacy field from state
            nodePositions: undefined,
          };
        }

        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        console.error('Failed to parse saved org map settings', e);
        return DEFAULT_SETTINGS;
      }
    }

    // Check for legacy theme setting to migrate
    const legacyTheme = localStorage.getItem('orgTreeTheme');
    if (legacyTheme) {
      return { ...DEFAULT_SETTINGS, theme: legacyTheme };
    }

    return DEFAULT_SETTINGS;
  });

  // Effect to handle orgId changes - reload settings when switching orgs
  useEffect(() => {
    if (!orgId) return;

    const storageKey = `orgMap_${orgId}_settings`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LegacySettings;

        // Same migration logic for effect
        if (parsed.nodePositions && !parsed.nodePositionsTB && !parsed.nodePositionsLR) {
          const direction = (parsed.layoutDirection as 'TB' | 'LR') || 'TB';
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            nodePositionsTB: direction === 'TB' ? parsed.nodePositions : {},
            nodePositionsLR: direction === 'LR' ? parsed.nodePositions : {},
          });
        } else {
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      // Check for legacy theme if no specific settings exist
      const legacyTheme = localStorage.getItem('orgTreeTheme');
      setSettings(prev => ({
        ...DEFAULT_SETTINGS,
        theme: legacyTheme || prev.theme || 'blue',
      }));
    }
    setIsLoaded(true);
  }, [orgId]);

  // Save to localStorage whenever settings change
  useEffect(() => {
    if (!orgId || !isLoaded) return;

    const storageKey = `orgMap_${orgId}_settings`;

    // Deep comparison to check if settings match defaults
    // This prevents saving completely default state and solves the reset/re-save issue
    const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS);

    if (isDefault) {
      // If settings are default, ensure storage is clear
      // This also prevents "ghost" legacy theme migration on next reload because
      // we prefer to keep storage clean. However, if legacy theme exists,
      // we might want to save to override it?
      // Actually, if we clear storage, the hook init logic will read legacy theme again.
      // So if we want to truly reset to "slate" even if legacy is "orange", we MUST save "slate".
      // But for the test case "should reset", we expect null.
      // Let's rely on the test expectation being correct for "clean slate" behavior.
      const legacyTheme = localStorage.getItem('orgTreeTheme');
      if (!legacyTheme) {
        localStorage.removeItem(storageKey);
        return;
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(settings));

    // Also sync the theme to the global legacy key for backward compatibility/other components
    if (settings.theme) {
      localStorage.setItem('orgTreeTheme', settings.theme);
    }
  }, [settings, orgId, isLoaded]);

  const updateSettings = useCallback((updates: Partial<OrgMapSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    if (!orgId) return;
    const storageKey = `orgMap_${orgId}_settings`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem('orgTreeTheme');
    setSettings(DEFAULT_SETTINGS);
  }, [orgId]);

  return { settings, updateSettings, resetSettings, isLoaded };
}
