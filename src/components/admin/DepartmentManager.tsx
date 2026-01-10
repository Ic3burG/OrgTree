import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import DepartmentForm from './DepartmentForm';
import DeleteConfirmModal from './DeleteConfirmModal';
import BulkActionBar from './BulkActionBar';
import BulkDeleteModal from './BulkDeleteModal';
import BulkEditModal from './BulkEditModal';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { useSearch } from '../../hooks/useSearch';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import type { Department, SearchResult, BulkOperationResult } from '../../types/index.js';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Building2,
  Users,
  Loader2,
  Search,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

interface DepartmentWithDepth extends Department {
  depth: number;
  children: DepartmentWithDepth[];
}

// Build tree structure from flat list (only used when not searching)
const buildTree = (
  depts: Department[],
  parentId: string | null = null,
  depth = 0
): DepartmentWithDepth[] => {
  return depts
    .filter((d: Department) => d.parent_id === parentId)
    .map((dept: Department) => ({
      ...dept,
      depth,
      children: buildTree(depts, dept.id, depth + 1),
    }));
};

export default function DepartmentManager(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Use the search hook for API-based search
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    loading: searchLoading,
    total: searchTotal,
  } = useSearch(orgId, { debounceMs: 300, minQueryLength: 2, defaultType: 'departments' });

  // Modal states
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showDelete, setShowDelete] = useState<boolean>(false);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Bulk operations state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState<boolean>(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState<boolean>(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState<boolean>(false);
  const [bulkOperationResult, setBulkOperationResult] = useState<BulkOperationResult | null>(null);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    deletedCount: number;
    failedCount: number;
    warnings?: string[];
    errors?: Array<{ id: string; error: string }>;
  } | null>(null);
  const [bulkEditResult, setBulkEditResult] = useState<{
    updatedCount: number;
    failedCount: number;
  } | null>(null);

  const loadDepartments = useCallback(
    async (showLoading = true): Promise<void> => {
      if (!orgId) return;
      try {
        if (showLoading) setLoading(true);
        const data = await api.getDepartments(orgId);
        setDepartments(data);
        // Auto-expand all on initial load
        if (showLoading) {
          setExpanded(new Set(data.map((d: Department) => d.id)));
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Real-time updates
  const { isRecentlyChanged } = useRealtimeUpdates(orgId, {
    onDepartmentChange: () => loadDepartments(false),
    onPersonChange: () => loadDepartments(false),
    showNotifications: true,
  });

  const handleCreateDept = async (
    formData: Pick<Department, 'name' | 'description' | 'parent_id'>
  ): Promise<void> => {
    if (!orgId) return;
    setFormLoading(true);
    setError('');
    try {
      await api.createDepartment(orgId, formData);
      await loadDepartments();
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDept = async (
    formData: Pick<Department, 'name' | 'description' | 'parent_id'>
  ): Promise<void> => {
    if (!orgId || !editingDept) return;
    setFormLoading(true);
    setError('');
    try {
      await api.updateDepartment(orgId, editingDept.id, formData);
      await loadDepartments();
      setShowForm(false);
      setEditingDept(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDept = async (): Promise<void> => {
    if (!orgId || !deletingDept) return;
    setFormLoading(true);
    try {
      await api.deleteDepartment(orgId, deletingDept.id);
      await loadDepartments();
      setShowDelete(false);
      setDeletingDept(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const openCreateForm = (): void => {
    setEditingDept(null);
    setShowForm(true);
  };

  const openEditForm = (dept: Department): void => {
    setEditingDept(dept);
    setShowForm(true);
  };

  const toggleExpand = (id: string): void => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const tree = useMemo(() => buildTree(departments), [departments]);

  // Determine if we're in search mode
  const isSearching = searchQuery.length >= 2;

  // Bulk selection hook - use flat list for selection
  const {
    selectionMode,
    toggleSelectionMode,
    exitSelectionMode,
    selectedArray,
    selectedCount,
    hasSelection,
    toggleSelect,
    isSelected,
    toggleSelectAll,
    allSelected,
  } = useBulkSelection(departments);

  // Bulk operation handlers
  const handleBulkDelete = async (): Promise<void> => {
    if (!orgId) return;
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      setBulkDeleteResult(null);
      const result = await api.bulkDeleteDepartments(orgId, selectedArray);
      setBulkOperationResult(result);
      setBulkDeleteResult({
        deletedCount: result.deletedCount ?? 0,
        failedCount: result.failedCount ?? 0,
        warnings: result.warnings,
        errors: result.failed,
      });
      if ((result.deletedCount ?? 0) > 0) {
        await loadDepartments(false);
      }
    } catch (err) {
      setBulkOperationResult({
        success: 0,
        failed: [{ id: 'bulk', error: (err as Error).message }],
        errors: [{ id: 'bulk', error: (err as Error).message }],
      });
      setBulkDeleteResult({
        deletedCount: 0,
        failedCount: selectedCount,
        errors: [{ id: 'bulk', error: (err as Error).message }],
      });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkEdit = async (updates: { parentId?: string | null }): Promise<void> => {
    if (!orgId) return;
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      setBulkEditResult(null);
      const result = await api.bulkEditDepartments(orgId, selectedArray, updates);
      setBulkOperationResult(result);
      setBulkEditResult({
        updatedCount: result.updatedCount ?? 0,
        failedCount: result.failedCount ?? 0,
      });
      if ((result.updatedCount ?? 0) > 0) {
        await loadDepartments(false);
      }
    } catch (err) {
      setBulkOperationResult({
        success: 0,
        failed: [{ id: 'bulk', error: (err as Error).message }],
        errors: [{ id: 'bulk', error: (err as Error).message }],
      });
      setBulkEditResult({ updatedCount: 0, failedCount: selectedCount });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const closeBulkModal = (modalSetter: (value: boolean) => void): void => {
    modalSetter(false);
    setBulkOperationResult(null);
    setBulkDeleteResult(null);
    setBulkEditResult(null);
    if (bulkOperationResult && bulkOperationResult.success > 0) {
      exitSelectionMode();
    }
  };

  // Render a single department in tree view
  const renderDepartment = (dept: DepartmentWithDepth): React.JSX.Element => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expanded.has(dept.id);
    const peopleCount = dept.people?.length || 0;
    const recentlyChanged = isRecentlyChanged(dept.id);
    const selected = isSelected(dept.id);

    return (
      <div key={dept.id}>
        <div
          onClick={selectionMode ? () => toggleSelect(dept.id) : undefined}
          className={`flex items-center gap-2 p-3 rounded-lg group transition-all duration-300 ${
            selectionMode ? 'cursor-pointer' : ''
          } ${recentlyChanged ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700' : ''} ${
            selectionMode && selected
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${dept.depth * 24 + 12}px` }}
        >
          {/* Checkbox in selection mode */}
          {selectionMode && (
            <div className="flex-shrink-0">
              {selected ? (
                <CheckSquare size={18} className="text-blue-600" />
              ) : (
                <Square size={18} className="text-slate-400" />
              )}
            </div>
          )}

          {!selectionMode && (
            <button
              onClick={() => toggleExpand(dept.id)}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${hasChildren ? '' : 'invisible'}`}
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-slate-400" />
              ) : (
                <ChevronRight size={16} className="text-slate-400" />
              )}
            </button>
          )}

          <Building2 size={18} className="text-slate-400" />

          <div className="flex-1">
            <span className="font-medium text-slate-800 dark:text-slate-100">{dept.name}</span>
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
              <Users size={14} className="inline mr-1" />
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
            </span>
            {dept.parent_id && <span className="ml-2 text-xs text-green-600">(has parent)</span>}
          </div>

          {/* Actions - hide in selection mode */}
          {!selectionMode && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <button
                onClick={() => openEditForm(dept)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil size={16} className="text-slate-500" />
              </button>
              <button
                onClick={() => {
                  setDeletingDept(dept);
                  setShowDelete(true);
                }}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 size={16} className="text-red-500" />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && !selectionMode && (
          <div>{dept.children.map(renderDepartment)}</div>
        )}
      </div>
    );
  };

  // Render a single search result (flat view)
  const renderSearchResult = (result: SearchResult): React.JSX.Element => {
    // Find the full department data from our loaded departments
    const fullDept = departments.find((d: Department) => d.id === result.id);
    const peopleCount = fullDept?.people?.length || 0;
    const recentlyChanged = isRecentlyChanged(result.id);
    const selected = isSelected(result.id);

    return (
      <div
        key={result.id}
        onClick={selectionMode ? () => toggleSelect(result.id) : undefined}
        className={`flex items-center gap-2 p-3 rounded-lg group transition-all duration-300 ${
          selectionMode ? 'cursor-pointer' : ''
        } ${recentlyChanged ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700' : ''} ${
          selectionMode && selected
            ? 'bg-blue-50 dark:bg-blue-900/30'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        {/* Checkbox in selection mode */}
        {selectionMode && (
          <div className="flex-shrink-0">
            {selected ? (
              <CheckSquare size={18} className="text-blue-600" />
            ) : (
              <Square size={18} className="text-slate-400" />
            )}
          </div>
        )}

        <Building2 size={18} className="text-slate-400" />

        <div className="flex-1">
          <span className="font-medium text-slate-800 dark:text-slate-100">{result.name}</span>
          <span className="ml-2 text-sm text-slate-500">
            <Users size={14} className="inline mr-1" />
            {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
          </span>
          {result.description && (
            <p className="text-sm text-slate-500 mt-1 truncate">{result.description}</p>
          )}
        </div>

        {/* Actions - hide in selection mode */}
        {!selectionMode && fullDept && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={() => openEditForm(fullDept)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil size={16} className="text-slate-500" />
            </button>
            <button
              onClick={() => {
                setDeletingDept(fullDept);
                setShowDelete(true);
              }}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - fixed */}
      <div className="flex-shrink-0 p-8 pb-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Departments</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                selectionMode
                  ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                  : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {selectionMode ? <X size={20} /> : <CheckSquare size={20} />}
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
            {!selectionMode && (
              <button
                onClick={openCreateForm}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors"
              >
                <Plus size={20} />
                Add Department
              </button>
            )}
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className="mb-4">
          <div className="relative max-w-md">
            {searchLoading ? (
              <Loader2
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                size={20}
              />
            ) : (
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
            )}
            <input
              type="text"
              placeholder="Search departments by name or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          {isSearching && searchTotal > 0 && (
            <p className="mt-2 text-sm text-slate-500">
              Found {searchTotal} department{searchTotal !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 min-h-0">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          {/* Select All header in selection mode */}
          {selectionMode && departments.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                {allSelected ? (
                  <CheckSquare size={18} className="text-blue-600" />
                ) : (
                  <Square size={18} />
                )}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {hasSelection && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ({selectedCount} selected)
                </span>
              )}
            </div>
          )}

          {isSearching ? (
            // Search results view (flat list)
            searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {searchLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Searching...</span>
                  </div>
                ) : (
                  <>
                    <p>No departments found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try a different search term</p>
                  </>
                )}
              </div>
            ) : (
              <div className="p-2">{searchResults.map(renderSearchResult)}</div>
            )
          ) : // Tree view (when not searching) - flat in selection mode
          tree.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No departments yet. Click "Add Department" to create one.
            </div>
          ) : selectionMode ? (
            // Flat list in selection mode
            <div className="p-2">
              {departments.map((dept: Department) =>
                renderDepartment({ ...dept, depth: 0, children: [] })
              )}
            </div>
          ) : (
            <div className="p-2">{tree.map(renderDepartment)}</div>
          )}
        </div>
      </div>

      {/* IMPORTANT: Pass departments to the form */}
      <DepartmentForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingDept(null);
        }}
        onSubmit={editingDept ? handleUpdateDept : handleCreateDept}
        department={editingDept}
        departments={departments}
        loading={formLoading}
      />

      <DeleteConfirmModal
        isOpen={showDelete}
        onClose={() => {
          setShowDelete(false);
          setDeletingDept(null);
        }}
        onConfirm={handleDeleteDept}
        title="Delete Department"
        itemName={deletingDept?.name}
        message={
          deletingDept?.children?.length
            ? `This will also delete ${deletingDept.children.length} sub-department(s).`
            : undefined
        }
        loading={formLoading}
      />

      {/* Bulk Action Bar */}
      {selectionMode && hasSelection && (
        <BulkActionBar
          selectedCount={selectedCount}
          entityType="departments"
          onDelete={() => setBulkDeleteModalOpen(true)}
          onEdit={() => setBulkEditModalOpen(true)}
          onCancel={exitSelectionMode}
        />
      )}

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => closeBulkModal(setBulkDeleteModalOpen)}
        onConfirm={handleBulkDelete}
        count={selectedCount}
        entityType="departments"
        isDeleting={bulkOperationLoading}
        result={bulkDeleteResult}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => closeBulkModal(setBulkEditModalOpen)}
        onConfirm={handleBulkEdit}
        count={selectedCount}
        entityType="departments"
        departments={departments}
        isUpdating={bulkOperationLoading}
        result={bulkEditResult}
      />
    </div>
  );
}
