import { useState, useEffect } from 'react';
import { FileText, Clock, User, Building2, Filter, X, ChevronDown } from 'lucide-react';
import api from '../../api/client';
import {
  formatActionType,
  formatEntityType,
  getActionColor,
  formatEntityDetails,
  formatDate
} from '../../utils/audit';

export default function SystemAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const fetchLogs = async (cursor = null, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setLogs([]);
      } else if (cursor) {
        setLoadingMore(true);
      }

      const params = {
        limit: 50,
        ...(cursor && { cursor }),
        ...(actionType && { actionType }),
        ...(entityType && { entityType }),
        ...(orgFilter && { orgId: orgFilter })
      };

      const result = await api.getAdminAuditLogs(params);

      if (reset || !cursor) {
        setLogs(result.logs);
      } else {
        setLogs(prev => [...prev, ...result.logs]);
      }

      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs(null, true);
  }, [actionType, entityType, orgFilter]);

  // Handle load more
  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchLogs(nextCursor);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setActionType('');
    setEntityType('');
    setOrgFilter('');
  };

  const hasActiveFilters = actionType || entityType || orgFilter;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading audit logs</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - fixed */}
      <div className="flex-shrink-0 px-4 py-8 pb-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="text-purple-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900">System Audit Logs</h1>
        </div>
        <p className="text-gray-600">Track all changes across all organizations</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <Filter size={20} />
            <span>Filters</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X size={16} />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="added">Added</option>
                <option value="removed">Removed</option>
                <option value="settings">Settings</option>
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Entities</option>
                <option value="department">Departments</option>
                <option value="person">People</option>
                <option value="member">Members</option>
                <option value="org">Organization</option>
              </select>
            </div>

            {/* Organization Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization ID
              </label>
              <input
                type="text"
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                placeholder="Filter by org ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 min-h-0">
        <div className="max-w-7xl mx-auto">
          {/* Audit Logs Table */}
          {logs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No audit logs yet
          </h3>
          <p className="text-gray-600">
            {hasActiveFilters
              ? 'No logs match your current filters'
              : 'System activity will appear here'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-purple-400" />
                        <span className="text-gray-900 truncate max-w-[150px]" title={log.organizationName}>
                          {log.organizationName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-900">{log.actorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType)}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatEntityType(log.entityType)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatEntityDetails(log.entityType, log.entityData)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} />
                    {formatDate(log.createdAt)}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType)}`}>
                    {log.actionType}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-purple-400" />
                    <span className="text-sm text-gray-900">{log.organizationName || 'Unknown'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{log.actorName}</span>
                  </div>

                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{formatEntityType(log.entityType)}:</span>{' '}
                    {formatEntityDetails(log.entityType, log.entityData)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
}
