import React from 'react';
import { useTransferNotifications } from '../hooks/useTransferNotifications';

/**
 * Component that listens for ownership transfer events and shows notifications.
 * Should be mounted inside SocketProvider.
 */
export default function TransferNotificationListener(): React.JSX.Element | null {
  useTransferNotifications();
  return null;
}
