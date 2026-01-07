import { X, Trash2, FolderInput, Edit3 } from 'lucide-react';

/**
 * Floating action bar for bulk operations
 * @param {Object} props
 * @param {number} props.selectedCount - Number of selected items
 * @param {string} props.entityType - 'people' or 'departments'
 * @param {Function} props.onDelete - Delete callback
 * @param {Function} props.onMove - Move callback (people only)
 * @param {Function} props.onEdit - Edit callback
 * @param {Function} props.onCancel - Cancel/exit selection mode callback
 */
export default function BulkActionBar({
  selectedCount,
  entityType = 'people',
  onDelete,
  onMove,
  onEdit,
  onCancel,
}) {
  if (selectedCount === 0) return null;

  const itemLabel =
    selectedCount === 1
      ? entityType === 'people'
        ? 'person'
        : 'department'
      : entityType === 'people'
        ? 'people'
        : 'departments';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-4 z-50">
      {/* Selected count */}
      <span className="text-sm font-medium min-w-[100px]">
        {selectedCount} {itemLabel} selected
      </span>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-600" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Move button (people only) */}
        {entityType === 'people' && onMove && (
          <button
            onClick={onMove}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
          >
            <FolderInput size={16} />
            Move
          </button>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </button>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-600" />

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
      >
        <X size={16} />
        Cancel
      </button>
    </div>
  );
}
