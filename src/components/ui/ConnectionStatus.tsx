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
import { useSocket } from '../../contexts/SocketContext';

type ConnectionStatusType = 'connected' | 'error' | 'disconnected';

/**
 * Subtle connection status indicator - just a small colored dot
 * Green = connected, Amber = reconnecting, Gray = disconnected
 */
export default function ConnectionStatus(): React.JSX.Element {
  const { isConnected, connectionError } = useSocket();

  // Determine status
  let status: ConnectionStatusType = 'disconnected';
  let tooltip = 'Disconnected';

  if (isConnected) {
    status = 'connected';
    tooltip = 'Real-time updates active';
  } else if (connectionError) {
    status = 'error';
    tooltip = `Connection error: ${connectionError}`;
  }

  const colors: Record<ConnectionStatusType, string> = {
    connected: 'bg-green-500',
    error: 'bg-amber-500',
    disconnected: 'bg-gray-400',
  };

  return (
    <div className="relative group">
      <div
        className={`w-2 h-2 rounded-full ${colors[status]} ${status === 'connected' ? 'animate-pulse' : ''}`}
        title={tooltip}
      />
      {/* Tooltip on hover */}
      <div className="absolute right-0 top-full mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {tooltip}
      </div>
    </div>
  );
}
