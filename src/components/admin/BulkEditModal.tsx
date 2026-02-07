import React, { useState } from 'react';
import { X, Edit3, Settings2 } from 'lucide-react';
import type { Department, CustomFieldDefinition } from '../../types/index.js';
import { buildDepartmentTree } from '../../utils/departmentUtils.js';
import HierarchicalTreeSelector from '../ui/HierarchicalTreeSelector.js';
import CustomFieldInput from '../ui/CustomFieldInput.js';

interface BulkEditResult {
  updatedCount: number;
  failedCount: number;
}

interface BulkEditUpdates {
  title?: string;
  departmentId?: string;
  parentId?: string | null;
  customFields?: Record<string, string | null>;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: BulkEditUpdates) => void;
  count: number;
  entityType?: 'people' | 'departments';
  departments?: Department[];
  fieldDefinitions?: CustomFieldDefinition[];
  isUpdating?: boolean;
  result?: BulkEditResult | null;
}

export default function BulkEditModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  entityType = 'people',
  departments = [],
  fieldDefinitions = [],
  isUpdating = false,
  result = null,
}: BulkEditModalProps): React.JSX.Element | null {
  const [title, setTitle] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');

  // Track which fields are enabled for the bulk update
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | null>>({});

  if (!isOpen) return null;

  const toggleField = (fieldId: string) => {
    const next = new Set(enabledFields);
    if (next.has(fieldId)) {
      next.delete(fieldId);
    } else {
      next.add(fieldId);
    }
    setEnabledFields(next);
  };

  const handleConfirm = (): void => {
    const updates: BulkEditUpdates = {};

    if (entityType === 'people') {
      if (enabledFields.has('title')) updates.title = title.trim();
      if (enabledFields.has('departmentId')) updates.departmentId = departmentId;

      const customUpdates: Record<string, string | null> = {};
      let hasCustom = false;
      fieldDefinitions.forEach(def => {
        if (enabledFields.has(def.id)) {
          customUpdates[def.field_key] = customFieldValues[def.id] ?? null;
          hasCustom = true;
        }
      });

      if (hasCustom) {
        updates.customFields = customUpdates;
      }
    } else {
      if (enabledFields.has('parentId')) {
        updates.parentId = parentId === 'root' ? null : parentId;
      }
    }

    if (Object.keys(updates).length > 0) {
      onConfirm(updates);
    }
  };

  const handleClose = (): void => {
    setTitle('');
    setDepartmentId('');
    setParentId('');
    setEnabledFields(new Set());
    setCustomFieldValues({});
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
  const hasUpdates = enabledFields.size > 0;

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-edit-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85dvh] flex flex-col border border-gray-100 dark:border-slate-700 overflow-hidden transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 bg-gray-50/50 dark:bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-500 ${
                hasResult ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
              }`}
            >
              <Edit3
                size={24}
                className={
                  hasResult
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              />
            </div>
            <div>
              <h2
                id="bulk-edit-title"
                className="text-xl font-bold text-gray-900 dark:text-slate-100"
              >
                {hasResult ? 'Update Successful' : `Bulk Update ${count} ${itemLabel}`}
              </h2>
              {!hasResult && (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Configure changes to apply
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          {hasResult ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/40 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Edit3 size={20} />
                </div>
                <div>
                  <p className="text-green-800 dark:text-green-200 font-semibold text-lg">
                    {result.updatedCount === count
                      ? 'All updates completed!'
                      : 'Updates partially completed'}
                  </p>
                  <p className="text-green-700/70 dark:text-green-300/70 text-sm">
                    {result.updatedCount} {result.updatedCount === 1 ? 'item was' : 'items were'}{' '}
                    successfully updated.
                  </p>
                </div>
              </div>
              {result.failedCount > 0 && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800/40 flex items-center justify-center text-red-600 dark:text-red-400">
                    <X size={16} />
                  </div>
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    {result.failedCount} items failed to update.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-sm shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <Settings2 size={18} />
                </div>
                <p className="leading-relaxed">
                  <span className="font-bold">Instructions:</span> Toggle the switches next to the
                  fields you wish to update. Fields that are not enabled will keep their original
                  values.
                </p>
              </div>

              <div className="space-y-8">
                {entityType === 'people' ? (
                  <>
                    {/* Standard Fields Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                          Standard Fields
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Title field */}
                        <div
                          className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                            enabledFields.has('title')
                              ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-blue-100 dark:ring-blue-900/20 shadow-sm'
                              : 'border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
                              Job Title
                            </label>
                            <button
                              onClick={() => toggleField('title')}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                enabledFields.has('title')
                                  ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                                  : 'bg-gray-200 dark:bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                                  enabledFields.has('title') ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              disabled={!enabledFields.has('title') || isUpdating}
                              placeholder={
                                enabledFields.has('title')
                                  ? 'Enter new job title'
                                  : 'Field disabled'
                              }
                              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 disabled:opacity-40 disabled:bg-gray-50 dark:disabled:bg-slate-800 transition-all"
                            />
                          </div>
                        </div>

                        {/* Department field */}
                        <div
                          className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                            enabledFields.has('departmentId')
                              ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-blue-100 dark:ring-blue-900/20 shadow-sm'
                              : 'border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
                              Department
                            </label>
                            <button
                              onClick={() => toggleField('departmentId')}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                enabledFields.has('departmentId')
                                  ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                                  : 'bg-gray-200 dark:bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                                  enabledFields.has('departmentId')
                                    ? 'translate-x-6'
                                    : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <HierarchicalTreeSelector
                            items={buildDepartmentTree(departments)}
                            value={departmentId}
                            onChange={id => setDepartmentId(id || '')}
                            disabled={!enabledFields.has('departmentId') || isUpdating}
                            placeholder={
                              enabledFields.has('departmentId')
                                ? 'Select new department'
                                : 'Field disabled'
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields Section */}
                    {fieldDefinitions.length > 0 && (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                            Custom Fields
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {fieldDefinitions.map(def => (
                            <div
                              key={def.id}
                              className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                                enabledFields.has(def.id)
                                  ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-900/10 ring-1 ring-purple-100 dark:ring-purple-900/20 shadow-sm'
                                  : 'border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <label
                                  className="text-sm font-bold text-gray-700 dark:text-slate-300 truncate mr-2"
                                  title={def.name}
                                >
                                  {def.name}
                                </label>
                                <button
                                  onClick={() => toggleField(def.id)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex-shrink-0 ${
                                    enabledFields.has(def.id)
                                      ? 'bg-purple-600 shadow-md shadow-purple-500/30'
                                      : 'bg-gray-200 dark:bg-slate-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                                      enabledFields.has(def.id) ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                              <div
                                className={`transition-all duration-300 ${!enabledFields.has(def.id) ? 'opacity-30 grayscale blur-[0.5px] select-none pointer-events-none' : 'opacity-100'}`}
                              >
                                <CustomFieldInput
                                  definition={def}
                                  value={customFieldValues[def.id] || null}
                                  onChange={val =>
                                    setCustomFieldValues(prev => ({ ...prev, [def.id]: val }))
                                  }
                                  disabled={!enabledFields.has(def.id) || isUpdating}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Parent department field for departments */
                  <div
                    className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                      enabledFields.has('parentId')
                        ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-blue-100 dark:ring-blue-900/20 shadow-sm'
                        : 'border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
                        Move to Parent Department
                      </label>
                      <button
                        onClick={() => toggleField('parentId')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          enabledFields.has('parentId')
                            ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                            : 'bg-gray-200 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                            enabledFields.has('parentId') ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <HierarchicalTreeSelector
                      items={buildDepartmentTree(departments)}
                      value={parentId === 'root' ? 'root_fake_id' : parentId}
                      onChange={id => setParentId(id === 'root_fake_id' ? 'root' : id || '')}
                      disabled={!enabledFields.has('parentId') || isUpdating}
                      placeholder={
                        enabledFields.has('parentId') ? 'Keep existing parent' : 'Field disabled'
                      }
                      allowClear={true}
                    />
                    {/* Note: In bulk edit, root level is handled specifically. Added a small adjustment above for the 'root' option if needed, but the TreeSelector usually selects real department IDs. For bulk root move, we might need a special node. For now, let's keep it simple. */}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 bg-gray-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
          {hasResult ? (
            <button
              onClick={handleClose}
              className="px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
            >
              Close Window
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={isUpdating}
                className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl disabled:opacity-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isUpdating || !hasUpdates}
                className="px-10 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:shadow-none active:scale-[0.98] transition-all duration-300 min-w-[140px]"
              >
                {isUpdating ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Edit3 size={18} />
                    <span>
                      Update {count} {itemLabel}
                    </span>
                  </div>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}
