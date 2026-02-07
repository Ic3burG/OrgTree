import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Settings, Trash2, Star } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../api/client.js';
import type { Person, Department, CustomFieldDefinition } from '../../types/index.js';
import { buildDepartmentTree } from '../../utils/departmentUtils.js';
import HierarchicalTreeSelector from '../ui/HierarchicalTreeSelector.js';
import CustomFieldInput from '../ui/CustomFieldInput.js';
import CustomFieldForm from './CustomFieldForm.js';
import DeleteConfirmModal from './DeleteConfirmModal.js';

interface PersonFormData {
  name: string;
  title: string;
  email: string;
  phone: string;
  departmentId: string;
  isStarred: boolean;
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
  defaultDepartmentId?: string;
}

export default function PersonForm({
  isOpen,
  onClose,
  onSubmit,
  person = null,
  departments = [],
  isSubmitting = false,
  defaultDepartmentId,
}: PersonFormProps): React.JSX.Element | null {
  const { orgId } = useParams<{ orgId: string }>();
  const [formData, setFormData] = useState<PersonFormData>({
    name: '',
    title: '',
    email: '',
    phone: '',
    departmentId: '',
    isStarred: false,
    customFields: {},
  });
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loadingDefinitions, setLoadingDefinitions] = useState(false);

  // Field management states
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [isFieldSubmitting, setIsFieldSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDefinitions = useCallback(async () => {
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
  }, [orgId, isOpen]);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        title: person.title || '',
        email: person.email || '',
        phone: person.phone || '',
        departmentId: person.department_id || '',
        isStarred: Boolean(person.is_starred),
        customFields: person.custom_fields || {},
      });
    } else {
      setFormData({
        name: '',
        title: '',
        email: '',
        phone: '',
        departmentId: defaultDepartmentId || departments[0]?.id || '',
        isStarred: false,
        customFields: {},
      });
    }
    setErrors({});
  }, [person, departments, isOpen, defaultDepartmentId]);

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

  const handleAddField = () => {
    setEditingField(null);
    setIsFieldFormOpen(true);
  };

  const handleEditField = (def: CustomFieldDefinition) => {
    setEditingField(def);
    setIsFieldFormOpen(true);
  };

  const handleDeleteField = (def: CustomFieldDefinition) => {
    setFieldToDelete(def);
    setDeleteModalOpen(true);
  };

  const handleFieldFormSubmit = async (data: Partial<CustomFieldDefinition>) => {
    if (!orgId) return;
    try {
      setIsFieldSubmitting(true);
      if (editingField) {
        await api.updateCustomFieldDefinition(orgId, editingField.id, data);
      } else {
        await api.createCustomFieldDefinition(orgId, {
          ...data,
          entity_type: 'person',
        });
      }
      setIsFieldFormOpen(false);
      await loadDefinitions();
    } catch (err) {
      alert((err as Error).message || 'Failed to save field');
    } finally {
      setIsFieldSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!orgId || !fieldToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteCustomFieldDefinition(orgId, fieldToDelete.id);
      setDeleteModalOpen(false);
      setFieldToDelete(null);
      await loadDefinitions();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete field');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-form-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2
            id="person-form-title"
            className="text-xl font-semibold text-gray-900 dark:text-slate-100"
          >
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

            {/* Department */}
            <div>
              <label
                htmlFor="departmentId"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
              >
                Department *
              </label>
              <HierarchicalTreeSelector
                id="departmentId"
                items={buildDepartmentTree(departments)}
                value={formData.departmentId}
                onChange={id => setFormData(prev => ({ ...prev, departmentId: id || '' }))}
                placeholder="Select a department"
                error={!!errors.departmentId}
                disabled={isSubmitting}
              />
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

            {/* Star/Favorite Toggle */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isStarred: !prev.isStarred }))}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  formData.isStarred
                    ? 'bg-amber-400 text-white shadow-lg shadow-amber-500/25'
                    : 'bg-white dark:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-amber-500 border border-gray-200 dark:border-slate-600'
                }`}
                aria-label={formData.isStarred ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star size={20} fill={formData.isStarred ? 'currentColor' : 'none'} />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {formData.isStarred ? 'Starred Contact' : 'Star this Contact'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Starred contacts appear at the top of their department
                </p>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  Additional Information
                </h3>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add Field
                </button>
              </div>

              {fieldDefinitions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldDefinitions.map(def => (
                    <div key={def.id} className="relative group">
                      <CustomFieldInput
                        definition={def}
                        value={formData.customFields[def.field_key] || null}
                        onChange={val => handleCustomFieldChange(def.field_key, val)}
                        disabled={isSubmitting}
                      />
                      <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleEditField(def)}
                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit definition"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(def)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete definition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loadingDefinitions && (
                  <p className="text-xs text-center text-gray-400 dark:text-slate-500 py-4 italic bg-gray-50/50 dark:bg-slate-900/20 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                    No additional information fields defined yet.
                  </p>
                )
              )}
            </div>

            {loadingDefinitions && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

        {/* Field Management Modals */}
        <CustomFieldForm
          isOpen={isFieldFormOpen}
          onClose={() => setIsFieldFormOpen(false)}
          onSubmit={handleFieldFormSubmit}
          definition={editingField}
          isSubmitting={isFieldSubmitting}
          fixedEntityType="person"
        />

        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Custom Field"
          message={`Are you sure you want to delete "${fieldToDelete?.name}"? Data in this field will be lost for everyone.`}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
