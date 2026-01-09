import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Clock, User, Filter, X, ChevronDown } from 'lucide-react';
import api from '../../api/client';
import type { AuditLog as AuditLogType } from '../../types/index.js';
import {
  formatEntityType,
  getActionColor,
  formatEntityDetails,
  formatDate,
} from '../../utils/audit';

export default function AuditLog(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const fetchLogs = async (cursor: string | null = null, reset = false): Promise<void> => {
    if (!orgId) return;

    try {
      if (reset) {
        setLoading(true);
        setLogs([]);
      } else if (cursor) {
        setLoadingMore(true);
      }

      const params: Record<string, string> = {
        limit: '50',
        ...(cursor && { cursor }),
        ...(actionType && { actionType }),
        ...(entityType && { entityType }),
      };

      const result = await api.getAuditLogs(orgId!, params);

      if (reset || !cursor) {
        setLogs(result.logs || []);
      } else {
        setLogs(prev => [...prev, ...(result.logs || [])]);
      }

      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load audit logs');
      } else {
        setError('Failed to load audit logs');
      }
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, actionType, entityType]);

  // Handle load more
  const handleLoadMore = (): void => {
    if (nextCursor && !loadingMore) {
      fetchLogs(nextCursor);
    }
  };

  // Clear filters
  const clearFilters = (): void => {
    setActionType('');
    setEntityType('');
  };

  const hasActiveFilters = actionType || entityType;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <FileText className="text-blue-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Audit Log</h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track all changes made to this organization
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                {/* Action Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Type
                  </label>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100"
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
                    onChange={e => setEntityType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Entities</option>
                    <option value="department">Departments</option>
                    <option value="person">People</option>
                    <option value="member">Members</option>
                    <option value="org">Organization</option>
                  </select>
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
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <FileText className="mx-auto text-gray-400 dark:text-slate-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No audit logs yet
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                {hasActiveFilters
                  ? 'No logs match your current filters'
                  : 'Actions performed on this organization will appear here'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Actor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Entity Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            {formatDate(log.createdAt!)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <span className="text-gray-900 dark:text-slate-100">
                              {log.actorName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType!)}`}
                          >
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                          {formatEntityType(log.entityType!)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatEntityDetails(log.entityType!, log.entityData!)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                        <Clock size={16} />
                        {formatDate(log.createdAt!)}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType!)}`}
                      >
                        {log.actionType}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{log.actorName}</span>
                      </div>

                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{formatEntityType(log.entityType!)}:</span>{' '}
                        {formatEntityDetails(log.entityType!, log.entityData!)}
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
