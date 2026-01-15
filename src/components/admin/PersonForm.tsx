import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../api/client.js';
import type { Person, Department, CustomFieldDefinition } from '../../types/index.js';
import { getHierarchicalDepartments, getIndentedName } from '../../utils/departmentUtils.js';
import CustomFieldInput from '../ui/CustomFieldInput.js';

interface PersonFormData {
  name: string;
  title: string;
  email: string;
  phone: string;
  departmentId: string;
  customFields: Record<string, string | null>;
}

interface PersonFormErrors {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
}

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PersonFormData) => void;
  person?: Person | null;
  departments?: Department[];
  isSubmitting?: boolean;
}

export default function PersonForm({
  isOpen,
  onClose,
  onSubmit,
  person = null,
  departments = [],
  isSubmitting = false,
}: PersonFormProps): React.JSX.Element | null {
  const { orgId } = useParams<{ orgId: string }>();
  const [formData, setFormData] = useState<PersonFormData>({
    name: '',
    title: '',
    email: '',
    phone: '',
    departmentId: '',
    customFields: {},
  });
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loadingDefinitions, setLoadingDefinitions] = useState(false);

  useEffect(() => {
    async function loadDefinitions() {
      if (!orgId || !isOpen) return;
      try {
        setLoadingDefinitions(true);
        const defs = await api.getCustomFieldDefinitions(orgId);
        setFieldDefinitions(defs.filter(d => d.entity_type === 'person'));
      } catch (err) {
        console.error('Failed to load person custom field definitions:', err);
      } finally {
        setLoadingDefinitions(false);
      }
    }
    loadDefinitions();
  }, [orgId, isOpen]);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        title: person.title || '',
        email: person.email || '',
        phone: person.phone || '',
        departmentId: person.department_id || '',
        customFields: person.custom_fields || {},
      });
    } else {
      setFormData({
        name: '',
        title: '',
        email: '',
        phone: '',
        departmentId: departments[0]?.id || '',
        customFields: {},
      });
    }
    setErrors({});
  }, [person, departments, isOpen]);

  const validate = (): boolean => {
    const newErrors: PersonFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData((prev: PersonFormData) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof PersonFormErrors]) {
      setErrors((prev: PersonFormErrors) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCustomFieldChange = (key: string, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {person ? 'Edit Person' : 'Add Person'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., John Doe"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
              >
                Job Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50"
                placeholder="e.g., Senior Engineer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div>
                <label
                  htmlFor="departmentId"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
                >
                  Department *
                </label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50 ${
                    errors.departmentId ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  <option value="">Select a department</option>
                  {getHierarchicalDepartments(departments).map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {getIndentedName(dept.name, dept.depth)}
                    </option>
                  ))}
                </select>
                {errors.departmentId && (
                  <p className="text-sm text-red-600 mt-1">{errors.departmentId}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50 ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="john.doe@example.com"
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
              >
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-50"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Custom Fields Section */}
            {fieldDefinitions.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldDefinitions.map(def => (
                    <CustomFieldInput
                      key={def.id}
                      definition={def}
                      value={formData.customFields[def.field_key] || null}
                      onChange={val => handleCustomFieldChange(def.field_key, val)}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              </div>
            )}

            {loadingDefinitions && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? 'Saving...' : person ? 'Update Person' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
