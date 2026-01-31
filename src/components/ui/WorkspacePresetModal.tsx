import React from 'react';
import { X, Trash2 } from 'lucide-react';
import type { WorkspacePreset } from '../../hooks/useWorkspacePresets';

interface WorkspacePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: WorkspacePreset[];
  onDeletePreset: (id: string) => void;
}

export default function WorkspacePresetModal({
  isOpen,
  onClose,
  presets,
  onDeletePreset,
}: WorkspacePresetModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  // Filter out built-in presets (assuming they have isDefault: true)
  const customPresets = presets.filter(p => !p.isDefault);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Manage Presets
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {customPresets.length > 0 ? (
            <ul className="space-y-2">
              {customPresets.map(preset => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg group"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    {preset.name}
                  </span>
                  <button
                    onClick={() => onDeletePreset(preset.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete preset"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              <p>No custom presets saved.</p>
              <p className="text-xs mt-1">Save your current layout to create one.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
