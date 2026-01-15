import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../api/client.js';
import type { Department, CustomFieldDefinition } from '../../types/index.js';
import { getHierarchicalDepartments, getIndentedName } from '../../utils/departmentUtils.js';
import CustomFieldInput from '../ui/CustomFieldInput.js';

interface DepartmentFormData {
  name: string;
  description: string;
  parentId: string | null;
  customFields: Record<string, string | null>;
}

interface DepartmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormData) => void;
  department: Department | null;
  departments: Department[];
  loading: boolean;
}

export default function DepartmentForm({
  isOpen,
  onClose,
  onSubmit,
  department,
  departments,
  loading,
}: DepartmentFormProps): React.JSX.Element | null {
  const { orgId } = useParams<{ orgId: string }>();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');
  const [customFields, setCustomFields] = useState<Record<string, string | null>>({});
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loadingDefinitions, setLoadingDefinitions] = useState(false);

  const isEditing = !!department;

  useEffect(() => {
    async function loadDefinitions() {
      if (!orgId || !isOpen) return;
      try {
        setLoadingDefinitions(true);
        const defs = await api.getCustomFieldDefinitions(orgId);
        setFieldDefinitions(defs.filter(d => d.entity_type === 'department'));
      } catch (err) {
        console.error('Failed to load department custom field definitions:', err);
      } finally {
        setLoadingDefinitions(false);
      }
    }
    loadDefinitions();
  }, [orgId, isOpen]);

  // Reset form when opening/closing or when department changes
  useEffect(() => {
    if (isOpen) {
      if (department) {
        // Editing existing department
        setName(department.name || '');
        setDescription(department.description || '');
        setParentId(department.parent_id || '');
        setCustomFields(department.custom_fields || {});
      } else {
        // Creating new department
        setName('');
        setDescription('');
        setParentId('');
        setCustomFields({});
      }
    }
  }, [department, isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Build the data object explicitly
    const formData: DepartmentFormData = {
      name: name.trim(),
      description: description.trim(),
      parentId: parentId === '' ? null : parentId,
      customFields,
    };

    onSubmit(formData);
  };

  const handleCustomFieldChange = (key: string, value: string | null) => {
    setCustomFields(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Filter departments for parent dropdown
  // Exclude current department (can't be parent of itself)
  const availableParents = Array.isArray(departments)
    ? departments.filter((d: Department) => {
        if (!department) return true; // New department, show all
        return d.id !== department.id; // Exclude self when editing
      })
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {isEditing ? 'Edit Department' : 'Add Department'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Department Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                placeholder="e.g., Finance Department"
                required
              />
            </div>

            {/* Parent Department Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Parent Department
              </label>
              <select
                value={parentId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setParentId(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-sans"
              >
                <option value="">None (Top Level)</option>
                {getHierarchicalDepartments(availableParents).map(d => (
                  <option key={d.id} value={d.id}>
                    {getIndentedName(d.name, d.depth)}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                rows={3}
                placeholder="Describe this department's responsibilities..."
              />
            </div>

            {/* Custom Fields Section */}
            {fieldDefinitions.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  Additional Information
                </h3>
                {fieldDefinitions.map(def => (
                  <CustomFieldInput
                    key={def.id}
                    definition={def}
                    value={customFields[def.field_key] || null}
                    onChange={val => handleCustomFieldChange(def.field_key, val)}
                    disabled={loading}
                  />
                ))}
              </div>
            )}

            {loadingDefinitions && (
              <div className="flex items-center justify-center p-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Department' : 'Add Department'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
