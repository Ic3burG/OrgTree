import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface BulkDeleteResult {
  deletedCount: number;
  failedCount: number;
  warnings?: string[];
  errors?: Array<{ id: string; error: string }>;
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  entityType?: 'people' | 'departments';
  isDeleting?: boolean;
  result?: BulkDeleteResult | null;
}

/**
 * Confirmation modal for bulk delete operations
 */
export default function BulkDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  entityType = 'people',
  isDeleting = false,
  result = null,
}: BulkDeleteModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const itemLabel =
    count === 1
      ? entityType === 'people'
        ? 'person'
        : 'department'
      : entityType === 'people'
        ? 'people'
        : 'departments';

  const hasResult = result && (result.deletedCount > 0 || result.failedCount > 0);
  const hasWarnings = result?.warnings && result.warnings.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasResult ? 'bg-blue-100' : 'bg-red-100'
              }`}
            >
              <AlertTriangle size={20} className={hasResult ? 'text-blue-600' : 'text-red-600'} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {hasResult ? 'Delete Complete' : `Delete ${count} ${itemLabel}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {hasResult ? (
            <>
              <div className="space-y-2">
                {result.deletedCount > 0 && (
                  <p className="text-green-600">
                    Successfully deleted {result.deletedCount}{' '}
                    {result.deletedCount === 1 ? 'item' : 'items'}
                  </p>
                )}
                {result.failedCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-red-600 font-medium">
                      Failed to delete {result.failedCount}{' '}
                      {result.failedCount === 1 ? 'item' : 'items'}
                    </p>
                    {result.errors && result.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800 mb-2">Error details:</p>
                        <ul className="text-sm text-red-700 space-y-1">
                          {result.errors.slice(0, 10).map((err, i) => (
                            <li key={i} className="break-words">
                              <span className="font-mono text-xs opacity-75">
                                {err.id.slice(0, 8)}...
                              </span>
                              : {err.error}
                            </li>
                          ))}
                          {result.errors.length > 10 && (
                            <li className="text-xs opacity-75">
                              ...and {result.errors.length - 10} more error(s)
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {hasWarnings && result.warnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 mb-2">Warnings:</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {result.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Are you sure you want to delete {count} {itemLabel}? This action cannot be undone.
              </p>
              {entityType === 'departments' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    <strong>Warning:</strong> Deleting departments will also delete all
                    sub-departments and people within them.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {hasResult ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : `Delete ${count} ${itemLabel}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
