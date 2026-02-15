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
  PieChart,
} from 'recharts';
import { OrgStructuralHealth } from '../../../types/index';

interface StructureHealthProps {
  data: OrgStructuralHealth | null;
  loading: boolean;
}

export default function StructureHealth({
  data,
  loading,
}: StructureHealthProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[300px]">
          <div className="h-full w-full bg-gray-100 dark:bg-slate-700/50 rounded-lg"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[300px]">
          <div className="h-full w-full bg-gray-100 dark:bg-slate-700/50 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-500">No structure data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Max Depth</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {data.maxDepth}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            Avg Span of Control
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {data.avgSpanOfControl > 0 ? data.avgSpanOfControl : 'N/A'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Direct reports per manager</p>
        </div>
        {/* Add more stats if available in future */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Sizes */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
            Largest Departments
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.departmentSizes?.slice(0, 10) || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="stroke-gray-200 dark:stroke-slate-700"
                />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-lg shadow-lg">
                          <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                            {label}
                          </p>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color || entry.fill }}
                              />
                              <span className="text-gray-500 dark:text-slate-400 capitalize">
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
                <Bar
                  dataKey="count"
                  name="People"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Placeholder for distribution or other struct chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
            <PieChart width={48} height={48} className="text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            Span of Control Distribution
          </h3>
          <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-sm">
            This metric requires manager relationships to be defined in your organization data.
            Coming soon when manager field is fully supported.
          </p>
        </div>
      </div>
    </div>
  );
}
