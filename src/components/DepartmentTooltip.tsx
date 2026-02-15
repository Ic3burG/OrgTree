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

interface DepthColor {
  hex: string;
  bg: string;
  text: string;
}

interface DepartmentTooltipProps {
  description: string | null;
  depthColor: DepthColor;
  placement?: 'top' | 'bottom';
}

/**
 * DepartmentTooltip - Shows department responsibilities on hover
 * Displays as a floating tooltip with bullet points
 */
export default function DepartmentTooltip({
  description,
  depthColor,
  placement = 'bottom',
}: DepartmentTooltipProps): React.JSX.Element | null {
  if (!description) return null;

  // Parse description into bullet points (split by periods)
  const responsibilities = parseDescription(description);

  if (responsibilities.length === 0) return null;

  const borderColor = depthColor.hex + '4D'; // Add 30% opacity (4D in hex)
  const arrowPosition = placement === 'top' ? 'bottom' : 'top';

  return (
    <div
      className="bg-white rounded-lg shadow-lg border relative"
      style={{
        borderColor: borderColor,
        maxWidth: '320px',
        minWidth: '280px',
      }}
    >
      {/* Arrow pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          [arrowPosition]: '-8px',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          [placement === 'top' ? 'borderTop' : 'borderBottom']: `8px solid ${borderColor}`,
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          [arrowPosition]: '-6px',
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          [placement === 'top' ? 'borderTop' : 'borderBottom']: '7px solid white',
        }}
      />

      {/* Bullet list */}
      <div className="px-4 py-3 max-h-64 overflow-y-auto">
        <ul className="space-y-2">
          {responsibilities.slice(0, 6).map((item, index) => (
            <li key={index} className="flex gap-2 text-sm text-slate-700">
              <span className="text-slate-400 flex-shrink-0 mt-0.5">•</span>
              <span className="flex-grow">{item}</span>
            </li>
          ))}
          {responsibilities.length > 6 && (
            <li className="text-sm text-slate-400 italic">
              +{responsibilities.length - 6} more...
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Parse description string into individual responsibility items
 * Splits by periods and filters out empty strings
 */
function parseDescription(description: string | null): string[] {
  if (!description) return [];

  return description
    .split('.')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}
