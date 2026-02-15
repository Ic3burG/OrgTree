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

import React from 'react';
import { getThemeList } from '../utils/colors';

interface ThemePickerProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

/**
 * ThemePicker - Color theme selector with circular swatches
 */
export default function ThemePicker({
  currentTheme,
  onThemeChange,
}: ThemePickerProps): React.JSX.Element {
  const themes = getThemeList();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 mr-1">Theme:</span>
      <div className="flex gap-1.5">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`
              w-5 h-5 rounded-full transition-all
              ${
                currentTheme === theme.id
                  ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                  : 'hover:scale-110'
              }
            `}
            style={
              theme.id === 'rainbow'
                ? {
                    background:
                      'conic-gradient(from 0deg, #ef4444 0deg, #fb923c 51deg, #fbbf24 102deg, #84cc16 153deg, #06b6d4 204deg, #3b82f6 255deg, #a855f7 306deg, #ef4444 360deg)',
                  }
                : { backgroundColor: theme.swatch }
            }
            title={theme.name}
            aria-label={`${theme.name} theme`}
          />
        ))}
      </div>
    </div>
  );
}
