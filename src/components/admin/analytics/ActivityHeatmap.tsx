import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, User } from 'lucide-react';

// We need to define the full ActivityMetrics interface locally or import it if we move it to shared types
// For now, based on backend service:
interface ActivityMetrics {
  totalEdits: number;
  editsPerDay: { date: string; count: number }[];
  topEditors: { userId: string; name: string; email: string; editCount: number }[];
  peakActivityHour: number;
  recentActions: { action: string; count: number }[];
}

interface ActivityHeatmapProps {
  data: ActivityMetrics | null; // Using local interface that matches backend response
  loading: boolean;
  period: string;
}

export default function ActivityHeatmap({
  data,
  loading,
}: ActivityHeatmapProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px] flex items-center justify-center animate-pulse">
        <div className="h-full w-full bg-gray-100 dark:bg-slate-700/50 rounded-lg"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-500">No activity data available</div>;
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Updates</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{data.totalEdits}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Peak Activity</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {formatHour(data.peakActivityHour)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
            <User size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Top Contributor</p>
            <p
              className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate max-w-[150px]"
              title={data.topEditors[0]?.email || ''}
            >
              {data.topEditors[0]?.name || data.topEditors[0]?.email || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
            Activity Volume
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.editsPerDay} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-gray-200 dark:stroke-slate-700"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={d =>
                    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  }
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-lg shadow-lg">
                          <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                            {new Date(label as string).toLocaleDateString()}
                          </p>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-gray-500 dark:text-slate-400">
                                {entry.name}:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-slate-100">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" name="Updates" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Types Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
            Action Types
          </h3>
          <div className="space-y-4">
            {data.recentActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-300 capitalize">
                  {action.action.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-3 flex-1 max-w-[200px] ml-4">
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (action.count / Math.max(...data.recentActions.map(a => a.count))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 min-w-[30px] text-right">
                    {action.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
