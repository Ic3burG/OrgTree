import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DepartmentForm({
  isOpen,
  onClose,
  onSubmit,
  department,
  departments,
  loading,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  const isEditing = !!department;

  // Reset form when opening/closing or when department changes
  useEffect(() => {
    if (isOpen) {
      if (department) {
        // Editing existing department
        setName(department.name || '');
        setDescription(department.description || '');
        setParentId(department.parentId || '');
      } else {
        // Creating new department
        setName('');
        setDescription('');
        setParentId('');
      }
    }
  }, [department, isOpen]);

  const handleSubmit = e => {
    e.preventDefault();

    // Build the data object explicitly
    const formData = {
      name: name.trim(),
      description: description.trim(),
      parentId: parentId === '' ? null : parentId,
    };

    console.log('DepartmentForm submitting:', formData);
    onSubmit(formData);
  };

  // Filter departments for parent dropdown
  // Exclude current department (can't be parent of itself)
  const availableParents = Array.isArray(departments)
    ? departments.filter(d => {
        if (!department) return true; // New department, show all
        return d.id !== department.id; // Exclude self when editing
      })
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">
              {isEditing ? 'Edit Department' : 'Add Department'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="e.g., Finance Department"
                required
              />
            </div>

            {/* Parent Department Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Parent Department
              </label>
              <select
                value={parentId}
                onChange={e => {
                  console.log('Parent selected:', e.target.value);
                  setParentId(e.target.value);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
              >
                <option value="">None (Top Level)</option>
                {availableParents.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {availableParents.length} department(s) available as parent
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                rows={3}
                placeholder="Describe this department's responsibilities..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
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
