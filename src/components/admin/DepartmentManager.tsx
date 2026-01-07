import { useState, useEffect, useCallback, useMemo } from 'react';
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

export default function DepartmentManager() {
  const { orgId } = useParams();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  // Use the search hook for API-based search
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    loading: searchLoading,
    total: searchTotal,
  } = useSearch(orgId, { debounceMs: 300, minQueryLength: 2, defaultType: 'departments' });

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Bulk operations state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [bulkOperationResult, setBulkOperationResult] = useState(null);

  const loadDepartments = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const data = await api.getDepartments(orgId);
        console.log('Loaded departments:', data);
        setDepartments(data);
        // Auto-expand all on initial load
        if (showLoading) {
          setExpanded(new Set(data.map(d => d.id)));
        }
      } catch (err) {
        setError(err.message);
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

  const handleCreateDept = async formData => {
    console.log('handleCreateDept called with:', formData);
    setFormLoading(true);
    setError('');
    try {
      const result = await api.createDepartment(orgId, formData);
      console.log('Create result:', result);
      await loadDepartments();
      setShowForm(false);
    } catch (err) {
      console.error('Create error:', err);
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDept = async formData => {
    console.log('handleUpdateDept called with:', formData);
    console.log('Editing department ID:', editingDept.id);
    setFormLoading(true);
    setError('');
    try {
      const result = await api.updateDepartment(orgId, editingDept.id, formData);
      console.log('Update result:', result);
      await loadDepartments();
      setShowForm(false);
      setEditingDept(null);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDept = async () => {
    setFormLoading(true);
    try {
      await api.deleteDepartment(orgId, deletingDept.id);
      await loadDepartments();
      setShowDelete(false);
      setDeletingDept(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const openCreateForm = () => {
    console.log('Opening create form, departments available:', departments.length);
    setEditingDept(null);
    setShowForm(true);
  };

  const openEditForm = dept => {
    console.log('Opening edit form for:', dept);
    console.log('Current parentId:', dept.parentId);
    setEditingDept(dept);
    setShowForm(true);
  };

  const toggleExpand = id => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  // Build tree structure from flat list (only used when not searching)
  const buildTree = (depts, parentId = null, depth = 0) => {
    return depts
      .filter(d => d.parentId === parentId)
      .map(dept => ({
        ...dept,
        depth,
        children: buildTree(depts, dept.id, depth + 1),
      }));
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
  const handleBulkDelete = async () => {
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      const result = await api.bulkDeleteDepartments(orgId, selectedArray);
      setBulkOperationResult(result);
      if (result.deletedCount > 0) {
        await loadDepartments(false);
      }
    } catch (err) {
      setBulkOperationResult({ deletedCount: 0, failedCount: selectedCount, error: err.message });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkEdit = async updates => {
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      const result = await api.bulkEditDepartments(orgId, selectedArray, updates);
      setBulkOperationResult(result);
      if (result.updatedCount > 0) {
        await loadDepartments(false);
      }
    } catch (err) {
      setBulkOperationResult({ updatedCount: 0, failedCount: selectedCount, error: err.message });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const closeBulkModal = modalSetter => {
    modalSetter(false);
    setBulkOperationResult(null);
    if (bulkOperationResult?.deletedCount > 0 || bulkOperationResult?.updatedCount > 0) {
      exitSelectionMode();
    }
  };

  // Render a single department in tree view
  const renderDepartment = dept => {
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
          } ${recentlyChanged ? 'bg-blue-50 ring-2 ring-blue-200' : ''} ${
            selectionMode && selected ? 'bg-blue-50' : 'hover:bg-slate-50'
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
              className={`p-1 rounded hover:bg-slate-200 ${hasChildren ? '' : 'invisible'}`}
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
            <span className="font-medium text-slate-800">{dept.name}</span>
            <span className="ml-2 text-sm text-slate-500">
              <Users size={14} className="inline mr-1" />
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
            </span>
            {dept.parentId && <span className="ml-2 text-xs text-green-600">(has parent)</span>}
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
  const renderSearchResult = result => {
    // Find the full department data from our loaded departments
    const fullDept = departments.find(d => d.id === result.id) || result;
    const peopleCount = result.peopleCount || fullDept.people?.length || 0;
    const recentlyChanged = isRecentlyChanged(result.id);
    const selected = isSelected(result.id);

    return (
      <div
        key={result.id}
        onClick={selectionMode ? () => toggleSelect(result.id) : undefined}
        className={`flex items-center gap-2 p-3 rounded-lg group transition-all duration-300 ${
          selectionMode ? 'cursor-pointer' : ''
        } ${recentlyChanged ? 'bg-blue-50 ring-2 ring-blue-200' : ''} ${
          selectionMode && selected ? 'bg-blue-50' : 'hover:bg-slate-50'
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
          {result.highlight ? (
            <span
              className="font-medium text-slate-800 [&>mark]:bg-yellow-200 [&>mark]:rounded"
              dangerouslySetInnerHTML={{ __html: result.highlight }}
            />
          ) : (
            <span className="font-medium text-slate-800">{result.name}</span>
          )}
          <span className="ml-2 text-sm text-slate-500">
            <Users size={14} className="inline mr-1" />
            {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
          </span>
          {result.description && (
            <p className="text-sm text-slate-500 mt-1 truncate">{result.description}</p>
          )}
        </div>

        {/* Actions - hide in selection mode */}
        {!selectionMode && (
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
          <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                selectionMode
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {selectionMode ? <X size={20} /> : <CheckSquare size={20} />}
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
            {!selectionMode && (
              <button
                onClick={openCreateForm}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
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
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white rounded-lg shadow">
          {/* Select All header in selection mode */}
          {selectionMode && departments.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
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
                <span className="text-sm text-slate-500">({selectedCount} selected)</span>
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
              {departments.map(dept => renderDepartment({ ...dept, depth: 0, children: [] }))}
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
        result={bulkOperationResult}
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
        result={bulkOperationResult}
      />
    </div>
  );
}
