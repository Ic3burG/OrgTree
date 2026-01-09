import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Clock, User, Building2, Filter, X, ChevronDown } from 'lucide-react';
import api from '../../api/client';
import {
  formatEntityType,
  getActionColor,
  formatEntityDetails,
  formatDate,
} from '../../utils/audit';
import type { AuditLog, PaginatedResponse } from '../../types';

// Extended AuditLog with additional fields
interface AuditLogExtended extends AuditLog {
  organizationName?: string;
}

export default function SystemAuditLog(): React.JSX.Element {
  const [logs, setLogs] = useState<AuditLogExtended[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Filters
  const [actionType, setActionType] = useState<string>('');
  const [entityType, setEntityType] = useState<string>('');
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Fetch audit logs
  const fetchLogs = useCallback(
    async (cursor: string | null = null, reset: boolean = false): Promise<void> => {
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
          ...(orgFilter && { orgId: orgFilter }),
        };

        const result: PaginatedResponse<AuditLogExtended> = await api.getAdminAuditLogs(params);

        if (reset || !cursor) {
          setLogs((result.logs || []) as AuditLogExtended[]);
        } else {
          setLogs(prev => [...prev, ...((result.logs || []) as AuditLogExtended[])]);
        }

        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load audit logs';
        setError(errorMessage);
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [actionType, entityType, orgFilter]
  );

  // Initial load
  useEffect(() => {
    fetchLogs(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType, entityType, orgFilter]);

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                System Audit Logs
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track all changes across all organizations
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                {/* Action Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Type
                  </label>
                  <select
                    value={actionType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setActionType(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100"
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
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setEntityType(e.target.value)
                    }
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setOrgFilter(e.target.value)
                    }
                    placeholder="Filter by org ID..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100"
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
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <FileText className="mx-auto text-gray-400 dark:text-slate-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No audit logs yet
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                {hasActiveFilters
                  ? 'No logs match your current filters'
                  : 'System activity will appear here'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
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
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {logs.map((log: AuditLogExtended) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            {formatDate(log.createdAt || log.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-purple-400" />
                            <span
                              className="text-gray-900 truncate max-w-[150px]"
                              title={log.organizationName}
                            >
                              {log.organizationName || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <span className="text-gray-900">
                              {log.actorName || log.user_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType || log.action)}`}
                          >
                            {log.actionType || log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatEntityType(log.entityType || log.entity_type)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatEntityDetails(
                            log.entityType || log.entity_type,
                            log.entityData || log.snapshot
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {logs.map((log: AuditLogExtended) => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        {formatDate(log.createdAt || log.created_at)}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType || log.action)}`}
                      >
                        {log.actionType || log.action}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-purple-400" />
                        <span className="text-sm text-gray-900">
                          {log.organizationName || 'Unknown'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {log.actorName || log.user_name || 'Unknown'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-700">
                        <span className="font-medium">
                          {formatEntityType(log.entityType || log.entity_type)}:
                        </span>{' '}
                        {formatEntityDetails(
                          log.entityType || log.entity_type,
                          log.entityData || log.snapshot
                        )}
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
