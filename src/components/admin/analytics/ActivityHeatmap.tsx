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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Calendar, Clock, User, Eye } from 'lucide-react';

// For now, based on backend service:
interface ActivityMetrics {
  totalEdits: number;
  editsPerDay: { date: string; count: number }[];
  publicLinkViewsPerDay: { date: string; count: number }[];
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

  const totalPublicViews =
    data.publicLinkViewsPerDay?.reduce((sum, day) => sum + day.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
            <Eye size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Public Views</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {totalPublicViews}
            </p>
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
              className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate max-w-[120px]"
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
            Internal Activity
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

        {/* Public Views Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
            Public View Engagement
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.publicLinkViewsPerDay}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
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
                                style={{ backgroundColor: entry.stroke || entry.fill }}
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
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Public Views"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Types Breakdown */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
          Action Types Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Engagement Tip
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-400/80">
              Higher public view counts often correlate with organizational transparency. Share your
              public link in company newsletters or internal portals to improve discoverability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
