import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  isLive?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  isLive,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
            {isLive && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 dark:text-green-400">Live</span>
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  trend.value >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
          <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    </div>
  );
}
