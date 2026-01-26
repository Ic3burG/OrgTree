import React, { useState } from 'react';
import { X, FolderInput } from 'lucide-react';
import type { Department } from '../../types/index.js';
import { buildDepartmentTree } from '../../utils/departmentUtils.js';
import HierarchicalTreeSelector from '../ui/HierarchicalTreeSelector.js';

interface BulkMoveResult {
  movedCount: number;
  failedCount: number;
}

interface BulkMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetDepartmentId: string) => void;
  count: number;
  departments?: Department[];
  isMoving?: boolean;
  result?: BulkMoveResult | null;
}

export default function BulkMoveModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  departments = [],
  isMoving = false,
  result = null,
}: BulkMoveModalProps): React.JSX.Element | null {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = (): void => {
    if (selectedDeptId) {
      onConfirm(selectedDeptId);
    }
  };

  const handleClose = (): void => {
    setSelectedDeptId('');
    onClose();
  };

  const hasResult = result && (result.movedCount > 0 || result.failedCount > 0);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-move-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasResult ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
              }`}
            >
              <FolderInput
                size={20}
                className={
                  hasResult
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              />
            </div>
            <h2
              id="bulk-move-title"
              className="text-xl font-semibold text-gray-900 dark:text-slate-100"
            >
              {hasResult ? 'Move Complete' : `Move ${count} ${count === 1 ? 'person' : 'people'}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isMoving}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {hasResult ? (
            <div className="space-y-2">
              {result.movedCount > 0 && (
                <p className="text-green-600">
                  Successfully moved {result.movedCount}{' '}
                  {result.movedCount === 1 ? 'person' : 'people'}
                </p>
              )}
              {result.failedCount > 0 && (
                <p className="text-red-600">
                  Failed to move {result.failedCount}{' '}
                  {result.failedCount === 1 ? 'person' : 'people'}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-gray-600">
                Select a department to move {count} {count === 1 ? 'person' : 'people'} to:
              </p>
              <HierarchicalTreeSelector
                items={buildDepartmentTree(departments)}
                value={selectedDeptId}
                onChange={id => setSelectedDeptId(id || '')}
                placeholder="Select a department..."
                showBreadcrumb={true}
              />
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
                disabled={isMoving}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isMoving || !selectedDeptId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:bg-blue-400"
              >
                {isMoving ? 'Moving...' : 'Move'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
