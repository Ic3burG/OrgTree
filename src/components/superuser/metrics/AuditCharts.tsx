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

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Shield, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AuditMetrics } from '../../../types/metrics';

interface AuditChartsProps {
  data: AuditMetrics;
}

// Color palette for pie chart
const COLORS = [
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

export default function AuditCharts({ data }: AuditChartsProps) {
  const { isDarkMode } = useTheme();

  const colors = {
    grid: isDarkMode ? '#334155' : '#e5e7eb',
    text: isDarkMode ? '#94a3b8' : '#6b7280',
    bar: '#8b5cf6',
  };

  // Format action type for display
  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prepare pie chart data
  const pieData = data.actionDistribution.map(item => ({
    name: formatActionType(item.actionType),
    value: item.count,
  }));

  // Prepare bar chart data for top actors
  const barData = data.topActors.slice(0, 5).map(actor => ({
    name: actor.actorName || 'Unknown',
    actions: actor.count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Login Statistics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Login Security (24h)
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.loginStats24h.successful}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Successful</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {data.loginStats24h.failed}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Failed</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {data.loginStats24h.successRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Success Rate</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">Actions Today</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {data.actionsToday.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            <p className="text-sm text-cyan-700 dark:text-cyan-300">Actions This Week</p>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
              {data.actionsThisWeek.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Action Distribution Pie Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
          Action Distribution
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Types of actions over the last 7 days
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#f1f5f9' : '#1f2937',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Actors Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
          Most Active Users
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Top 5 users by activity over the last 7 days
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis type="number" stroke={colors.text} fontSize={12} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke={colors.text}
                fontSize={12}
                tickLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#f1f5f9' : '#1f2937',
                }}
              />
              <Bar dataKey="actions" fill={colors.bar} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
