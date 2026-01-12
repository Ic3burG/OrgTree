import React from 'react';
import { Plus, CheckSquare, X, Search, Loader2 } from 'lucide-react';
import type { Department } from '../../types/index.js';

interface PersonManagerHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterDepartment: string;
  onFilterChange: (deptId: string) => void;
  departments: Department[];
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onAddPerson: () => void;
  searchLoading: boolean;
  error?: string | null;
}

export default function PersonManagerHeader({
  searchTerm,
  onSearchChange,
  filterDepartment,
  onFilterChange,
  departments,
  selectionMode,
  onToggleSelectionMode,
  onAddPerson,
  searchLoading,
  error,
}: PersonManagerHeaderProps): React.JSX.Element {
  return (
    <div className="flex-shrink-0 p-6 pb-0">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">People</h1>
            <p className="text-gray-500 dark:text-slate-400">
              Manage people across all departments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                selectionMode
                  ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                  : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {selectionMode ? <X size={20} /> : <CheckSquare size={20} />}
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
            {!selectionMode && (
              <button
                onClick={onAddPerson}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                <Plus size={20} />
                Add Person
              </button>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters - fixed */}
        <div className="mb-4 bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              {searchLoading ? (
                <Loader2
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                />
              ) : (
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              )}
              <input
                type="text"
                placeholder="Search by name, title, email, or phone..."
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            {/* Department Filter */}
            <select
              value={filterDepartment}
              onChange={e => onFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">All Departments</option>
              {departments.map((dept: Department) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
