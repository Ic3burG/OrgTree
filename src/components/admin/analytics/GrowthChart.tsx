import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { OrgGrowthTrend } from '../../../types/index';

interface GrowthChartProps {
  data: OrgGrowthTrend[] | null;
  loading: boolean;
  period: string;
}

export default function GrowthChart({
  data,
  loading,
  period,
}: GrowthChartProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px] flex items-center justify-center animate-pulse">
        <div className="h-full w-full bg-gray-100 dark:bg-slate-700/50 rounded-lg"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px] flex items-center justify-center text-gray-500">
        No growth data available for this period
      </div>
    );
  }

  // Format date based on period
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: period === '1y' ? '2-digit' : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
          Organization Growth
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorPeople" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDept" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-gray-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
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
                          {formatDate(label as string)}
                        </p>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
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
              <Legend />
              <Area
                type="monotone"
                dataKey="peopleCount"
                name="People"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorPeople)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="departmentCount"
                name="Departments"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorDept)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
