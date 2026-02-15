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

import React, { useState } from 'react';
import { Monitor, Trash2, Check, Save } from 'lucide-react';
import { useWorkspacePresets } from '../../hooks/useWorkspacePresets';
import { useSidebar } from '../../hooks/useSidebar';

export default function PreferencesPage(): React.JSX.Element {
  const { presets, activePresetId, savePreset, deletePreset, applyPreset } = useWorkspacePresets();
  const { state, width, pinned, setState, setWidth, setPinned } = useSidebar();
  const [newPresetName, setNewPresetName] = useState('');

  const handleApply = (id: string) => {
    const config = applyPreset(id);
    if (config) {
      setState(config.sidebarState);
      setWidth(config.sidebarWidth);
      setPinned(config.sidebarPinned);
    }
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim(), {
        sidebarState: state,
        sidebarWidth: width,
        sidebarPinned: pinned,
      });
      setNewPresetName('');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Interface Preferences
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Customize your workspace layout and save presets for different tasks.
        </p>

        {/* Current State Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Current Layout
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-slate-500 dark:text-slate-500">Sidebar State:</span>{' '}
              <span className="font-medium capitalize">{state}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-500">Width:</span>{' '}
              <span className="font-medium">{width}px</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-500"> pinned:</span>{' '}
              <span className="font-medium">{pinned ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Save New Preset */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3">
            Save Current View as Preset
          </h3>
          <form onSubmit={handleSaveCurrent} className="flex gap-3 max-w-md">
            <input
              type="text"
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              placeholder="e.g., Wide Screen Analysis"
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newPresetName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={18} />
              Save
            </button>
          </form>
        </div>

        {/* Presets List */}
        <div>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3">
            Saved Layouts
          </h3>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {presets.map(preset => (
                <li
                  key={preset.id}
                  className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    activePresetId === preset.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        activePresetId === preset.id
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Monitor size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {preset.name}
                        </span>
                        {activePresetId === preset.id && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            Active
                          </span>
                        )}
                        {preset.isDefault && (
                          <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {preset.config.sidebarState} • {preset.config.sidebarWidth}px •{' '}
                        {preset.config.sidebarPinned ? 'Pinned' : 'Unpinned'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApply(preset.id)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Apply this layout"
                    >
                      <Check size={18} />
                    </button>
                    {!preset.isDefault && (
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete preset"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
