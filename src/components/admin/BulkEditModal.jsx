import { useState } from 'react';
import { X, Edit3 } from 'lucide-react';

/**
 * Modal for bulk editing items
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onConfirm - Confirm edit callback (updates) => void
 * @param {number} props.count - Number of items to edit
 * @param {string} props.entityType - 'people' or 'departments'
 * @param {Array} props.departments - Array of departments (for people's department selector)
 * @param {boolean} props.isUpdating - Loading state
 * @param {Object} props.result - Result from edit { updatedCount, failedCount }
 */
export default function BulkEditModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  entityType = 'people',
  departments = [],
  isUpdating = false,
  result = null,
}) {
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [parentId, setParentId] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const updates = {};

    if (entityType === 'people') {
      if (title.trim()) updates.title = title.trim();
      if (departmentId) updates.departmentId = departmentId;
    } else {
      // For departments, allow setting parentId to null (root level)
      if (parentId === 'root') {
        updates.parentId = null;
      } else if (parentId) {
        updates.parentId = parentId;
      }
    }

    if (Object.keys(updates).length > 0) {
      onConfirm(updates);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDepartmentId('');
    setParentId('');
    onClose();
  };

  const hasResult = result && (result.updatedCount > 0 || result.failedCount > 0);
  const itemLabel =
    count === 1
      ? entityType === 'people'
        ? 'person'
        : 'department'
      : entityType === 'people'
        ? 'people'
        : 'departments';

  // Check if any updates are selected
  const hasUpdates = entityType === 'people' ? title.trim() || departmentId : parentId;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasResult ? 'bg-green-100' : 'bg-blue-100'
              }`}
            >
              <Edit3 size={20} className={hasResult ? 'text-green-600' : 'text-blue-600'} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {hasResult ? 'Edit Complete' : `Edit ${count} ${itemLabel}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {hasResult ? (
            <div className="space-y-2">
              {result.updatedCount > 0 && (
                <p className="text-green-600">
                  Successfully updated {result.updatedCount}{' '}
                  {result.updatedCount === 1 ? 'item' : 'items'}
                </p>
              )}
              {result.failedCount > 0 && (
                <p className="text-red-600">
                  Failed to update {result.failedCount}{' '}
                  {result.failedCount === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm">
                Only fill in fields you want to change. Empty fields will be left unchanged.
              </p>

              {entityType === 'people' ? (
                <>
                  {/* Title field for people */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Leave empty to keep existing titles"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Department field for people */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Move to Department
                    </label>
                    <select
                      value={departmentId}
                      onChange={e => setDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Keep existing departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* Parent department field for departments */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Move to Parent Department
                  </label>
                  <select
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keep existing parent</option>
                    <option value="root">Root level (no parent)</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {hasResult ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isUpdating || !hasUpdates}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:bg-blue-400"
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
