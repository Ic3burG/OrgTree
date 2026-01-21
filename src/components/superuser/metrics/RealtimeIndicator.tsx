import { Wifi, WifiOff } from 'lucide-react';

interface RealtimeIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date | null;
}

export default function RealtimeIndicator({ isConnected, lastUpdate }: RealtimeIndicatorProps) {
  const formatLastUpdate = (date: Date | null): string => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Live</span>
          </>
        ) : (
          <>
            <span className="h-3 w-3 rounded-full bg-gray-400" />
            <WifiOff className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
              Disconnected
            </span>
          </>
        )}
      </div>
      <div className="h-4 w-px bg-gray-200 dark:bg-slate-600" />
      <span className="text-sm text-gray-500 dark:text-slate-400">
        Updated: {formatLastUpdate(lastUpdate)}
      </span>
    </div>
  );
}
