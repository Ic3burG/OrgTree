import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DepartmentForm({
  isOpen,
  onClose,
  onSubmit,
  department = null,
  departments = [],
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        description: department.description || '',
        parent_id: department.parent_id || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        parent_id: '',
      });
    }
    setErrors({});
  }, [department, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }

    // Prevent circular references
    if (department && formData.parent_id === department.id) {
      newErrors.parent_id = 'A department cannot be its own parent';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        parent_id: formData.parent_id || null,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Filter out current department and its descendants from parent options
  const getAvailableParents = () => {
    if (!department) return departments;

    const isDescendant = (deptId, potentialParentId) => {
      const dept = departments.find((d) => d.id === potentialParentId);
      if (!dept) return false;
      if (dept.parent_id === deptId) return true;
      if (dept.parent_id) return isDescendant(deptId, dept.parent_id);
      return false;
    };

    return departments.filter(
      (d) => d.id !== department.id && !isDescendant(department.id, d.id)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {department ? 'Edit Department' : 'Create Department'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Department Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Engineering"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Brief description of this department"
              />
            </div>

            {/* Parent Department */}
            <div>
              <label
                htmlFor="parent_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Parent Department
              </label>
              <select
                id="parent_id"
                name="parent_id"
                value={formData.parent_id}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  errors.parent_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">None (Top-level)</option>
                {getAvailableParents().map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {errors.parent_id && (
                <p className="text-sm text-red-600 mt-1">{errors.parent_id}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Optional: Select a parent to nest this department
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : department
                ? 'Update Department'
                : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
