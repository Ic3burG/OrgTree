import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, TrendingUp, Network, Activity, Search } from 'lucide-react';
import api from '../../api/client';
import OverviewPanel from './analytics/OverviewPanel';
import GrowthChart from './analytics/GrowthChart';
import StructureHealth from './analytics/StructureHealth';
import ActivityHeatmap from './analytics/ActivityHeatmap';
import SearchInsights from './analytics/SearchInsights';
import {
  OrgAnalyticsOverview,
  OrgGrowthTrend,
  OrgStructuralHealth,
  OrgActivityMetrics,
  OrgSearchAnalytics,
} from '../../types/index';
import { convertToCSV, downloadCSV } from '../../utils/analyticsExport';
import { Download } from 'lucide-react';

type TabId = 'overview' | 'growth' | 'structure' | 'activity' | 'search';

export default function AnalyticsDashboard(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overviewData, setOverviewData] = useState<OrgAnalyticsOverview | null>(null);
  const [growthData, setGrowthData] = useState<OrgGrowthTrend[] | null>(null);
  const [structureData, setStructureData] = useState<OrgStructuralHealth | null>(null);
  const [activityData, setActivityData] = useState<OrgActivityMetrics | null>(null);
  const [searchData, setSearchData] = useState<OrgSearchAnalytics | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) return;
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'overview' && !overviewData) {
          const data = await api.getOrgAnalyticsOverview(orgId);
          setOverviewData(data);
        } else if (activeTab === 'growth') {
          const data = await api.getOrgGrowthTrends(orgId, period);
          setGrowthData(data);
        } else if (activeTab === 'structure' && !structureData) {
          const data = await api.getOrgStructuralHealth(orgId);
          setStructureData(data);
        } else if (activeTab === 'activity') {
          const data = await api.getOrgActivityMetrics(orgId, period as '7d' | '30d' | '90d');
          setActivityData(data);
        } else if (activeTab === 'search') {
          const data = await api.getOrgSearchAnalytics(orgId, period as '7d' | '30d' | '90d');
          setSearchData(data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, activeTab, period, overviewData, structureData, activityData, searchData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
    { id: 'structure', label: 'Structure', icon: Network },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'search', label: 'Search', icon: Search },
  ] as const;

  const handleExport = () => {
    try {
      let csvContent = '';
      const filename = `analytics-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;

      if (activeTab === 'overview' && overviewData) {
        // Flatten overview data
        const flatData = [
          { Metric: 'Total Departments', Value: overviewData.totalDepartments },
          { Metric: 'Total People', Value: overviewData.totalPeople },
          { Metric: 'Total Members', Value: overviewData.totalMembers },
          { Metric: 'Avg Updates/Day', Value: overviewData.avgUpdatesPerDay },
        ];
        csvContent = convertToCSV(flatData);
      } else if (activeTab === 'growth' && growthData) {
        csvContent = convertToCSV(growthData);
      } else if (activeTab === 'structure' && structureData) {
        // Export department sizes which is the list data
        csvContent = convertToCSV(structureData.departmentSizes);
      } else if (activeTab === 'activity' && activityData) {
        // Export daily edits
        csvContent = convertToCSV(activityData.editsPerDay);
      } else if (activeTab === 'search' && searchData) {
        // Export top queries
        csvContent = convertToCSV(searchData.topQueries);
      }

      if (csvContent) {
        downloadCSV(filename, csvContent);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Analytics Dashboard
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Insights into your organization's structure and activity
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>

          <button
            onClick={() => handleExport()}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            title="Export current view to CSV"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mb-6">
            {error}
          </div>
        )}

        {activeTab === 'overview' && <OverviewPanel data={overviewData} loading={loading} />}

        {activeTab === 'growth' && (
          <GrowthChart data={growthData} loading={loading} period={period} />
        )}

        {activeTab === 'structure' && <StructureHealth data={structureData} loading={loading} />}

        {activeTab === 'activity' && (
          <ActivityHeatmap data={activityData} loading={loading} period={period} />
        )}

        {activeTab === 'search' && <SearchInsights data={searchData} loading={loading} />}
      </div>
    </div>
  );
}
