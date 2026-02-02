import React from 'react';
import { Search, AlertCircle, TrendingUp } from 'lucide-react';
import { OrgSearchAnalytics } from '../../../types/index';

interface SearchInsightsProps {
  data: OrgSearchAnalytics | null;
  loading: boolean;
}

export default function SearchInsights({ data, loading }: SearchInsightsProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px] flex items-center justify-center animate-pulse">
        <div className="h-full w-full bg-gray-100 dark:bg-slate-700/50 rounded-lg"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-500">No search data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
            <Search size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Searches</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {data.totalSearches}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
              Unique Searchers
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {data.uniqueSearchers}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Failed Queries</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {data.zeroResultQueries.reduce((acc, curr) => acc + curr.count, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Top Search Queries
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3">Query</th>
                  <th className="px-6 py-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.topQueries.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                      No queries recorded
                    </td>
                  </tr>
                ) : (
                  data.topQueries.map((item, index) => (
                    <tr
                      key={index}
                      className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-100">
                        {item.query}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 dark:text-slate-400">
                        {item.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zero Results Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Queries with No Results
            </h3>
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900/30 dark:text-red-300">
              Needs Attention
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3">Query</th>
                  <th className="px-6 py-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.zeroResultQueries.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                      No failed queries recorded
                    </td>
                  </tr>
                ) : (
                  data.zeroResultQueries.map((item, index) => (
                    <tr
                      key={index}
                      className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-100">
                        {item.query}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 dark:text-slate-400">
                        {item.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
