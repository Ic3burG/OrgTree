import React from 'react';
import { Plus, CheckSquare, X, Search, Loader2 } from 'lucide-react';

interface DepartmentManagerHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onAddDepartment: () => void;
  searchLoading: boolean;
  searchTotal: number;
  isSearching: boolean;
}

export default function DepartmentManagerHeader({
  searchQuery,
  onSearchChange,
  selectionMode,
  onToggleSelectionMode,
  onAddDepartment,
  searchLoading,
  searchTotal,
  isSearching,
}: DepartmentManagerHeaderProps): React.JSX.Element {
  return (
    <div className="flex-shrink-0 p-8 pb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Departments</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelectionMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              selectionMode
                ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {selectionMode ? <X size={20} /> : <CheckSquare size={20} />}
            {selectionMode ? 'Cancel' : 'Select'}
          </button>
          {!selectionMode && (
            <button
              onClick={onAddDepartment}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors"
            >
              <Plus size={20} />
              Add Department
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          {searchLoading ? (
            <Loader2
              className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
              size={20}
            />
          ) : (
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={20}
            />
          )}
          <input
            type="text"
            placeholder="Search departments by name or description..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        {isSearching && searchTotal > 0 && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Found {searchTotal} department{searchTotal !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
