import React, { memo } from 'react';
import { Mail, Phone, Edit, Trash2, CheckSquare, Square, Star } from 'lucide-react';
import type { Person, CustomFieldDefinition } from '../../types/index.js';

export interface PersonWithDepartmentName extends Person {
  departmentName?: string;
}

interface PersonItemProps {
  person: PersonWithDepartmentName;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (person: PersonWithDepartmentName) => void;
  onDelete: (person: PersonWithDepartmentName) => void;
  isRecentlyChanged: boolean;
  fieldDefinitions?: CustomFieldDefinition[];
}

const PersonItem = memo(function PersonItem({
  person,
  selectionMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  isRecentlyChanged,
  fieldDefinitions = [],
}: PersonItemProps): React.JSX.Element {
  // Filter out empty custom fields and map to their definitions
  const activeCustomFields = fieldDefinitions
    .filter(def => person.custom_fields && person.custom_fields[def.field_key])
    .map(def => ({
      definition: def,
      value: person.custom_fields![def.field_key],
    }));

  return (
    <div
      onClick={selectionMode ? () => onToggleSelect(person.id) : undefined}
      className={`p-6 transition-all duration-300 group ${selectionMode ? 'cursor-pointer' : ''} ${
        isRecentlyChanged
          ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700'
          : ''
      } ${
        selectionMode && isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox in selection mode */}
        {selectionMode && (
          <div className="pt-1">
            {isSelected ? (
              <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Square size={20} className="text-gray-400 dark:text-slate-500" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate flex items-center gap-2">
              {person.name}
              {person.is_starred && (
                <Star size={16} className="text-amber-400 flex-shrink-0" fill="currentColor" />
              )}
            </h3>
            {person.departmentName && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded whitespace-nowrap">
                {person.departmentName}
              </span>
            )}
          </div>

          {person.title && (
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 truncate">
              {person.title}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-slate-400 mb-4">
            {person.email && (
              <div className="flex items-center gap-2 max-w-full">
                <Mail size={16} className="flex-shrink-0" />
                <a
                  href={`mailto:${person.email}`}
                  className="hover:text-blue-600 truncate"
                  onClick={e => selectionMode && e.preventDefault()}
                >
                  {person.email}
                </a>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <span>{person.phone}</span>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {activeCustomFields.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t border-gray-100 dark:border-slate-700">
              {activeCustomFields.map(({ definition, value }) => (
                <div key={definition.id} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    {definition.name}:
                  </span>
                  <span className="text-sm text-gray-700 dark:text-slate-300 truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions - hide in selection mode */}
        {!selectionMode && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(person);
              }}
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Edit person"
              aria-label={`Edit ${person.name}`}
            >
              <Edit size={18} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(person);
              }}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete person"
              aria-label={`Delete ${person.name}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PersonItem;
