import React from 'react';
import { Search, Plus, CheckSquare, Square } from 'lucide-react';
import PersonItem, { type PersonWithDepartmentName } from './PersonItem';

interface PersonListProps {
  people: PersonWithDepartmentName[];
  totalPeopleCount: number; // For "No people yet" check
  loading: boolean;
  searchTerm: string;
  filterDepartment: string;
  searchTotal: number;
  onAddPerson: () => void;
  // Selection
  selectionMode: boolean;
  hasSelection: boolean;
  selectedCount: number;
  allSelected: boolean;
  toggleSelectAll: () => void;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
  // Actions
  onEdit: (person: PersonWithDepartmentName) => void;
  onDelete: (person: PersonWithDepartmentName) => void;
  isRecentlyChanged: (id: string) => boolean;
}

export default function PersonList({
  people,
  totalPeopleCount,
  loading,
  searchTerm,
  filterDepartment,
  searchTotal,
  onAddPerson,
  selectionMode,
  hasSelection,
  selectedCount,
  allSelected,
  toggleSelectAll,
  isSelected,
  toggleSelect,
  onEdit,
  onDelete,
  isRecentlyChanged,
}: PersonListProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500 dark:text-slate-400">Loading people...</div>
          </div>
        </div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-slate-400">
            <Search size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
              {searchTerm || filterDepartment ? 'No people found' : 'No people yet'}
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              {searchTerm || filterDepartment
                ? 'Try adjusting your search or filters'
                : 'Add your first person to get started'}
            </p>
            {!searchTerm && !filterDepartment && (
              <button
                onClick={onAddPerson}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                <Plus size={20} />
                Add Person
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          {/* Select All header in selection mode */}
          {selectionMode && people.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100"
              >
                {allSelected ? (
                  <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square size={18} />
                )}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {hasSelection && (
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  ({selectedCount} selected)
                </span>
              )}
            </div>
          )}

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {people.map(person => (
              <PersonItem
                key={person.id}
                person={person}
                selectionMode={selectionMode}
                isSelected={isSelected(person.id)}
                onToggleSelect={toggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                isRecentlyChanged={isRecentlyChanged(person.id)}
              />
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-500 dark:text-slate-400 text-center">
          {searchTerm.length >= 2 ? (
            <>
              Found {searchTotal} result{searchTotal !== 1 ? 's' : ''}
              {filterDepartment && ` (${people.length} in selected department)`}
            </>
          ) : (
            <>
              Showing {people.length} of {totalPeopleCount} people
            </>
          )}
        </div>
      </div>
    </div>
  );
}
