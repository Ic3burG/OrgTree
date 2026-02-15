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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTheme } from '../../../contexts/ThemeContext';
import type { UsageMetrics } from '../../../types/metrics';

interface UsageChartsProps {
  data: UsageMetrics;
}

export default function UsageCharts({ data }: UsageChartsProps) {
  const { isDarkMode } = useTheme();

  // Chart theme colors
  const colors = {
    grid: isDarkMode ? '#334155' : '#e5e7eb',
    text: isDarkMode ? '#94a3b8' : '#6b7280',
    users: '#8b5cf6',
    orgs: '#06b6d4',
    active: '#22c55e',
  };

  // Format date for display (MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Merge user and org growth data for combined chart
  const growthData = data.userGrowth.map((point, index) => ({
    date: formatDate(point.date),
    users: point.count,
    orgs: data.orgGrowth[index]?.count || 0,
  }));

  // Active users trend data
  const activeUsersData = data.activeUsersTrend.map(point => ({
    date: formatDate(point.date),
    active: point.count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* User & Organization Growth */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          User & Organization Growth
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          New registrations over the last 30 days
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="date" stroke={colors.text} fontSize={12} tickLine={false} />
              <YAxis stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#f1f5f9' : '#1f2937',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                name="New Users"
                stroke={colors.users}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="orgs"
                name="New Organizations"
                stroke={colors.orgs}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Users Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Active Users
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Unique users with activity over the last 7 days
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activeUsersData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="date" stroke={colors.text} fontSize={12} tickLine={false} />
              <YAxis stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#f1f5f9' : '#1f2937',
                }}
              />
              <Line
                type="monotone"
                dataKey="active"
                name="Active Users"
                stroke={colors.active}
                strokeWidth={2}
                fill={colors.active}
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Volume */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Content Volume
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {data.contentVolume.departments.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Departments</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {data.contentVolume.people.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">People</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {data.contentVolume.auditLogs.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Audit Logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
