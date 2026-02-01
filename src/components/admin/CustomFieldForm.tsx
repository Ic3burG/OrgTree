import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import type { CustomFieldDefinition, CustomFieldType } from '../../types/index.js';

interface CustomFieldFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CustomFieldDefinition>) => void;
  definition?: CustomFieldDefinition | null;
  isSubmitting?: boolean;
  fixedEntityType?: 'person' | 'department';
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

export default function CustomFieldForm({
  isOpen,
  onClose,
  onSubmit,
  definition,
  isSubmitting = false,
  fixedEntityType,
}: CustomFieldFormProps): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [entityType, setEntityType] = useState<'person' | 'department'>('person');
  const [isRequired, setIsRequired] = useState(false);
  const [isSearchable, setIsSearchable] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (definition) {
      setName(definition.name);
      setFieldKey(definition.field_key);
      setFieldType(definition.field_type);
      setEntityType(definition.entity_type);
      setIsRequired(definition.is_required);
      setIsSearchable(definition.is_searchable);
      setOptions(definition.options || []);
    } else {
      setName('');
      setFieldKey('');
      setFieldType('text');
      setEntityType(fixedEntityType || 'person');
      setIsRequired(false);
      setIsSearchable(true); // Default to searchable
      setOptions([]);
    }
  }, [definition, isOpen, fixedEntityType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fieldKey) return;

    onSubmit({
      name,
      field_key: fieldKey,
      field_type: fieldType,
      entity_type: entityType,
      is_required: isRequired,
      is_searchable: isSearchable,
      options: ['select', 'multiselect'].includes(fieldType) ? options : null,
    });
  };

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate key if creating new and key hasn't been manually edited much
    if (!definition) {
      const generatedKey = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setFieldKey(generatedKey);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-field-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3
            id="custom-field-title"
            className="text-lg font-semibold text-gray-900 dark:text-slate-100"
          >
            {definition ? 'Edit Custom Field' : 'Add Custom Field'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Field Name
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Slack Handle"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Field Type
              </label>
              <select
                value={fieldType}
                onChange={e => setFieldType(e.target.value as CustomFieldType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all font-sans"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {!fixedEntityType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Entity Type
                </label>
                <select
                  value={entityType}
                  onChange={e => setEntityType(e.target.value as 'person' | 'department')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                  disabled={!!definition}
                >
                  <option value="person">Person</option>
                  <option value="department">Department</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={e => setIsRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">
                Required
              </span>
            </label>
          </div>

          {['select', 'multiselect'].includes(fieldType) && (
            <div className="space-y-2 border-t border-gray-200 dark:border-slate-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Options
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Add option..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {options.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg group"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-slate-300">{opt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2 italic">
                    No options added yet
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !fieldKey}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm shadow-blue-500/20"
            >
              {isSubmitting ? 'Saving...' : 'Save Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
