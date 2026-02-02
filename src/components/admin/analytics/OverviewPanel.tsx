import React from 'react';
import { Users, Building2, UserPlus, TrendingUp } from 'lucide-react';
import { OrgAnalyticsOverview } from '../../../types/index';

interface OverviewPanelProps {
  data: OrgAnalyticsOverview | null;
  loading: boolean;
}

export default function OverviewPanel({ data, loading }: OverviewPanelProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return <div className="text-gray-500">No data available</div>;

  const stats = [
    {
      label: 'Total People',
      value: data.totalPeople,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Departments',
      value: data.totalDepartments,
      icon: Building2,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Org Members',
      value: data.totalMembers,
      icon: UserPlus,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Daily Updates',
      value: data.avgUpdatesPerDay.toFixed(1),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mt-1">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
