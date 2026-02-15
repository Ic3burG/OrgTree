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

import { Server, Clock, Zap, Database, Wifi, AlertCircle } from 'lucide-react';
import type { PerformanceMetrics, MemoryUsage } from '../../../types/metrics';

interface PerformanceChartsProps {
  data: PerformanceMetrics;
  realtimeMemory?: MemoryUsage | null;
  realtimeConnections?: number | null;
}

export default function PerformanceCharts({
  data,
  realtimeMemory,
  realtimeConnections,
}: PerformanceChartsProps) {
  // Use realtime data if available, otherwise fall back to fetched data
  const memory = realtimeMemory || data.memory;
  const connections = realtimeConnections ?? data.activeConnections;

  // Calculate memory usage percentage (of heap)
  const heapUsagePercent = Math.round((memory.heapUsed / memory.heapTotal) * 100);

  // Helper to format bytes
  const formatMB = (mb: number) => `${mb} MB`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Server Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Server Status</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-sm text-gray-600 dark:text-slate-300">Uptime</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {data.uptimeHuman}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-sm text-gray-600 dark:text-slate-300">Active Connections</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {connections}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-sm text-gray-600 dark:text-slate-300">Database</span>
            </div>
            <span
              className={`text-sm font-medium ${
                data.database.status === 'connected'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {data.database.status === 'connected' ? 'Connected' : 'Error'}
            </span>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Memory Usage</h3>
          {realtimeMemory && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Memory Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-slate-300">Heap Usage</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {heapUsagePercent}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                heapUsagePercent > 90
                  ? 'bg-red-500'
                  : heapUsagePercent > 70
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
              }`}
              style={{ width: `${heapUsagePercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400">RSS</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {formatMB(memory.rss)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400">Heap Total</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {formatMB(memory.heapTotal)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400">Heap Used</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {formatMB(memory.heapUsed)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400">External</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {formatMB(memory.external)}
            </p>
          </div>
        </div>
      </div>

      {/* API Performance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 lg:col-span-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            API Performance
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {data.apiTiming.requestsPerMinute}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Requests/min</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {data.apiTiming.avgResponseTime}
              <span className="text-lg">ms</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Avg Response</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {data.apiTiming.p95ResponseTime}
              <span className="text-lg">ms</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">p95 Response</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              {data.apiTiming.errorRate > 5 && <AlertCircle className="w-5 h-5 text-red-500" />}
              <p
                className={`text-3xl font-bold ${
                  data.apiTiming.errorRate > 5
                    ? 'text-red-600 dark:text-red-400'
                    : data.apiTiming.errorRate > 1
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                }`}
              >
                {data.apiTiming.errorRate}%
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Error Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
