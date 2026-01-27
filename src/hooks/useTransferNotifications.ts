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
