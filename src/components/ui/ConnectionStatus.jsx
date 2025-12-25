import { useSocket } from '../../contexts/SocketContext';

/**
 * Subtle connection status indicator - just a small colored dot
 * Green = connected, Amber = reconnecting, Gray = disconnected
 */
export default function ConnectionStatus() {
  const { isConnected, connectionError } = useSocket();

  // Determine status
  let status = 'disconnected';
  let tooltip = 'Disconnected';

  if (isConnected) {
    status = 'connected';
    tooltip = 'Real-time updates active';
  } else if (connectionError) {
    status = 'error';
    tooltip = `Connection error: ${connectionError}`;
  }

  const colors = {
    connected: 'bg-green-500',
    error: 'bg-amber-500',
    disconnected: 'bg-gray-400'
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
