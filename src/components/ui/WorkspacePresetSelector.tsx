import React, { useState } from 'react';
import { ChevronDown, Save, Settings2, Check, Monitor } from 'lucide-react';
import type { WorkspacePreset, WorkspaceConfig } from '../../hooks/useWorkspacePresets';

interface WorkspacePresetSelectorProps {
  presets: WorkspacePreset[];
  activePresetId: string | null;
  currentConfig: WorkspaceConfig;
  onApplyPreset: (id: string) => void;
  onSavePreset: (name: string) => void;
  onManagePresets: () => void;
}

export default function WorkspacePresetSelector({
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onManagePresets,
}: WorkspacePresetSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const activePreset = presets.find(p => p.id === activePresetId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim());
      setNewPresetName('');
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
        title="Workspace Layouts"
      >
        <Monitor size={14} />
        <span className="max-w-[80px] truncate">{activePreset ? activePreset.name : 'Custom'}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-2 border-b border-gray-100 dark:border-slate-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">
                Layouts
              </div>
              <div className="space-y-0.5">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onApplyPreset(preset.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${
                      activePresetId === preset.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{preset.name}</span>
                    {activePresetId === preset.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 bg-gray-50 dark:bg-slate-800/50">
              {isSaving ? (
                <form onSubmit={handleSave} className="space-y-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!newPresetName.trim()}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSaving(false)}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => setIsSaving(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <Save size={14} />
                    Save current view...
                  </button>
                  <button
                    onClick={() => {
                      onManagePresets();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <Settings2 size={14} />
                    Manage presets...
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
