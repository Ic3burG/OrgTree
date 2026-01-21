import { useState, useEffect, useCallback } from 'react';
import { Users, Building2, FolderTree, UserCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { useSocket } from '../../contexts/SocketContext';
import type {
  OverviewMetrics,
  UsageMetrics,
  PerformanceMetrics,
  AuditMetrics,
  RealtimeMetricsUpdate,
} from '../../types/metrics';
import StatCard from './metrics/StatCard';
import RealtimeIndicator from './metrics/RealtimeIndicator';
import UsageCharts from './metrics/UsageCharts';
import PerformanceCharts from './metrics/PerformanceCharts';
import AuditCharts from './metrics/AuditCharts';

type TabId = 'usage' | 'performance' | 'security';

export default function MetricsDashboard() {
  const { socket, isConnected } = useSocket();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('usage');

  // Data state
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [audit, setAudit] = useState<AuditMetrics | null>(null);

  // Real-time state
  const [realtimeData, setRealtimeData] = useState<RealtimeMetricsUpdate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.getMetricsOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch overview metrics:', err);
      setError('Failed to load overview metrics');
    }
  }, []);

  // Fetch tab-specific data
  const fetchTabData = useCallback(async (tab: TabId) => {
    setError(null);
    try {
      switch (tab) {
        case 'usage': {
          const data = await api.getMetricsUsage();
          setUsage(data);
          break;
        }
        case 'performance': {
          const data = await api.getMetricsPerformance();
          setPerformance(data);
          break;
        }
        case 'security': {
          const data = await api.getMetricsAudit();
          setAudit(data);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} metrics:`, err);
      setError(`Failed to load ${tab} metrics`);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchTabData(activeTab)]);
      setLoading(false);
    };
    loadInitialData();
  }, [fetchOverview, fetchTabData, activeTab]);

  // Socket.IO room join/leave
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join admin metrics room
    socket.emit('join:admin:metrics');

    // Handle real-time updates
    const handleMetricsUpdate = (data: RealtimeMetricsUpdate) => {
      setRealtimeData(data);
      setLastUpdate(new Date());

      // Update overview with live connection count
      setOverview(prev =>
        prev
          ? {
              ...prev,
              activeConnections: data.activeConnections,
            }
          : prev
      );
    };

    socket.on('metrics:update', handleMetricsUpdate);

    return () => {
      socket.emit('leave:admin:metrics');
      socket.off('metrics:update', handleMetricsUpdate);
    };
  }, [socket, isConnected]);

  // Tab change handler
  const handleTabChange = async (tab: TabId) => {
    setActiveTab(tab);
    await fetchTabData(tab);
  };

  // Manual refresh
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchTabData(activeTab)]);
    setLoading(false);
  };

  const tabs = [
    { id: 'usage' as const, label: 'Usage' },
    { id: 'performance' as const, label: 'Performance' },
    { id: 'security' as const, label: 'Security' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">System Metrics</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Real-time application monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <RealtimeIndicator isConnected={isConnected} lastUpdate={lastUpdate} />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={overview.totalUsers}
            subtitle={overview.newUsersToday > 0 ? `+${overview.newUsersToday} today` : undefined}
            icon={Users}
            trend={
              overview.newUsersToday > 0
                ? { value: overview.newUsersToday, label: 'new today' }
                : undefined
            }
          />
          <StatCard
            title="Organizations"
            value={overview.totalOrganizations}
            subtitle={overview.newOrgsToday > 0 ? `+${overview.newOrgsToday} today` : undefined}
            icon={Building2}
            trend={
              overview.newOrgsToday > 0
                ? { value: overview.newOrgsToday, label: 'new today' }
                : undefined
            }
          />
          <StatCard title="Departments" value={overview.totalDepartments} icon={FolderTree} />
          <StatCard
            title="Active Users (24h)"
            value={realtimeData?.activeConnections ?? overview.activeConnections}
            subtitle={`${overview.activeUsers24h} unique users`}
            icon={UserCircle}
            isLive={!!realtimeData}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading && !overview ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading metrics...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'usage' && usage && <UsageCharts data={usage} />}
            {activeTab === 'performance' && performance && (
              <PerformanceCharts
                data={performance}
                realtimeMemory={realtimeData?.memory}
                realtimeConnections={realtimeData?.activeConnections}
              />
            )}
            {activeTab === 'security' && audit && <AuditCharts data={audit} />}
          </>
        )}
      </div>
    </div>
  );
}
