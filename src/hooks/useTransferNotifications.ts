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

import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

interface TransferEvent {
  transferId: string;
  orgId: string;
  orgName: string;
  initiatorName?: string;
  recipientName?: string;
}

export function useTransferNotifications() {
  const { socket, subscribe } = useSocket();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (!socket || !user) return;

    const handlers = [
      subscribe('transfer:initiated', (data: unknown) => {
        const payload = data as TransferEvent;
        window.dispatchEvent(
          new CustomEvent('realtime-notification', {
            detail: {
              message: `Ownership transfer initiated for ${payload.orgName}`,
              type: 'info',
            },
          })
        );
      }),

      subscribe('transfer:accepted', (data: unknown) => {
        const payload = data as TransferEvent;
        window.dispatchEvent(
          new CustomEvent('realtime-notification', {
            detail: {
              message: `Ownership transfer accepted for ${payload.orgName}`,
              type: 'success',
            },
          })
        );
        // Refresh user data to update roles
        api
          .getMe()
          .then(updatedUser => {
            setUser(updatedUser);
          })
          .catch(console.error);
      }),

      subscribe('transfer:rejected', (data: unknown) => {
        const payload = data as TransferEvent;
        window.dispatchEvent(
          new CustomEvent('realtime-notification', {
            detail: {
              message: `Ownership transfer rejected for ${payload.orgName}`,
              type: 'error',
            },
          })
        );
      }),

      subscribe('transfer:cancelled', (data: unknown) => {
        const payload = data as TransferEvent;
        window.dispatchEvent(
          new CustomEvent('realtime-notification', {
            detail: {
              message: `Ownership transfer cancelled for ${payload.orgName}`,
              type: 'info',
            },
          })
        );
      }),
    ];

    return () => {
      handlers.forEach(unsubscribe => unsubscribe());
    };
  }, [socket, user, subscribe, setUser]);
}
