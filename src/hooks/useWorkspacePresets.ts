import { useState, useEffect, useCallback } from 'react';
import type { SidebarState } from './useSidebar';

export interface WorkspaceConfig {
  sidebarState: SidebarState;
  sidebarWidth: number;
  sidebarPinned: boolean;
  // Potentially other settings in the future (e.g., theme)
}

export interface WorkspacePreset {
  id: string;
  name: string;
  isDefault?: boolean;
  config: WorkspaceConfig;
  createdAt: string;
}

const DEFAULT_PRESETS: WorkspacePreset[] = [
  {
    id: 'default',
    name: 'Default',
    isDefault: true,
    config: {
      sidebarState: 'expanded',
      sidebarWidth: 256,
      sidebarPinned: true,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'compact',
    name: 'Compact',
    isDefault: true,
    config: {
      sidebarState: 'minimized',
      sidebarWidth: 64, // Ignored in minimized but good for restoring
      sidebarPinned: true,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    isDefault: true,
    config: {
      sidebarState: 'hidden',
      sidebarWidth: 256,
      sidebarPinned: false,
    },
    createdAt: new Date().toISOString(),
  },
];

interface UseWorkspacePresetsReturn {
  presets: WorkspacePreset[];
  activePresetId: string | null;
  savePreset: (name: string, config: WorkspaceConfig) => void;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => WorkspaceConfig | null;
  resetPresets: () => void;
}

export function useWorkspacePresets(): UseWorkspacePresetsReturn {
  const [presets, setPresets] = useState<WorkspacePreset[]>(() => {
    const saved = localStorage.getItem('workspacePresets');
    return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('workspacePresets', JSON.stringify(presets));
  }, [presets]);

  const savePreset = useCallback((name: string, config: WorkspaceConfig) => {
    const newPreset: WorkspacePreset = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      name,
      config,
      createdAt: new Date().toISOString(),
    };
    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
  }, []);

  const deletePreset = useCallback(
    (id: string) => {
      setPresets(prev => prev.filter(p => p.id !== id || p.isDefault));
      if (activePresetId === id) {
        setActivePresetId(null);
      }
    },
    [activePresetId]
  );

  const applyPreset = useCallback(
    (id: string) => {
      const preset = presets.find(p => p.id === id);
      if (preset) {
        setActivePresetId(id);
        return preset.config;
      }
      return null;
    },
    [presets]
  );

  const resetPresets = useCallback(() => {
    setPresets(DEFAULT_PRESETS);
    setActivePresetId(null);
  }, []);

  return {
    presets,
    activePresetId,
    savePreset,
    deletePreset,
    applyPreset,
    resetPresets,
  };
}
