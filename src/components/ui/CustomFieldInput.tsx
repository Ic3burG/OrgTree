import React from 'react';
import type { CustomFieldDefinition } from '../../types/index.js';

interface CustomFieldInputProps {
  definition: CustomFieldDefinition;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export default function CustomFieldInput({
  definition,
  value,
  onChange,
  disabled = false,
}: CustomFieldInputProps): React.JSX.Element {
  const { name, field_type, options, is_required } = definition;

  const renderInput = () => {
    switch (field_type) {
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="">Select an option...</option>
            {options?.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'multiselect': {
        // For simplicity in a flat value structure, we might store multiselect as comma-separated or JSON
        // For now, let's treat it as a comma-separated string if used in a simple input,
        // but ideally we'd use a better UI. Let's just do a basic implementation first.
        const selectedOptions = value ? value.split(',') : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {options?.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(opt)}
                    disabled={disabled}
                    onChange={e => {
                      const newSelected = e.target.checked
                        ? [...selectedOptions, opt]
                        : selectedOptions.filter(o => o !== opt);
                      onChange(newSelected.length > 0 ? newSelected.join(',') : null);
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      }
      case 'url':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            placeholder="email@example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        );
      case 'phone':
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        );
      case 'text':
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            disabled={disabled}
            required={is_required}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
        {name}
        {is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}
