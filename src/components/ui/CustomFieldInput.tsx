/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
  const { name, field_type, options, is_required, id } = definition;
  const fieldId = `custom-field-${id}`;

  const renderInput = () => {
    switch (field_type) {
      case 'number':
        return (
          <input
            id={fieldId}
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
            id={fieldId}
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
            id={fieldId}
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
          <div className="space-y-2" id={fieldId} role="group" aria-label={name}>
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
            id={fieldId}
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
            id={fieldId}
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
            id={fieldId}
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
            id={fieldId}
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
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        {name}
        {is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}
