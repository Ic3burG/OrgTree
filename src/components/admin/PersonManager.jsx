import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Mail,
  Phone,
  Loader2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import api from '../../api/client';
import PersonForm from './PersonForm';
import DeleteConfirmModal from './DeleteConfirmModal';
import BulkActionBar from './BulkActionBar';
import BulkDeleteModal from './BulkDeleteModal';
import BulkMoveModal from './BulkMoveModal';
import BulkEditModal from './BulkEditModal';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { useSearch } from '../../hooks/useSearch';
import { useBulkSelection } from '../../hooks/useBulkSelection';

export default function PersonManager() {
  const { orgId } = useParams();
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use the search hook for API-based search
  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    results: searchResults,
    loading: searchLoading,
    total: searchTotal,
  } = useSearch(orgId, { debounceMs: 300, minQueryLength: 2, defaultType: 'people' });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk operations state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [bulkOperationResult, setBulkOperationResult] = useState(null);

  const loadData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        // Load organization with all departments and people
        const orgData = await api.getOrganization(orgId);
        setDepartments(orgData.departments || []);

        // Flatten people from all departments
        const allPeople = [];
        (orgData.departments || []).forEach(dept => {
          (dept.people || []).forEach(person => {
            allPeople.push({
              ...person,
              departmentName: dept.name,
            });
          });
        });
        setPeople(allPeople);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates
  const { isRecentlyChanged } = useRealtimeUpdates(orgId, {
    onDepartmentChange: () => loadData(false),
    onPersonChange: () => loadData(false),
    showNotifications: true,
  });

  const handleCreate = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleEdit = person => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async formData => {
    try {
      setIsSubmitting(true);
      if (editingPerson) {
        await api.updatePerson(editingPerson.id, formData);
      } else {
        await api.createPerson(formData.departmentId, formData);
      }
      setIsFormOpen(false);
      setEditingPerson(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to save person');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = person => {
    setPersonToDelete(person);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.deletePerson(personToDelete.id);
      setDeleteModalOpen(false);
      setPersonToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete person');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine which list to filter: search results (if searching) or all people
  const filteredPeople = useMemo(() => {
    // If we have a search term with enough characters, use API search results
    const baseList = searchTerm.length >= 2 ? searchResults : people;

    // Apply department filter locally
    if (!filterDepartment) {
      return baseList;
    }

    return baseList.filter(person => person.departmentId === filterDepartment);
  }, [searchTerm, searchResults, people, filterDepartment]);

  // Bulk selection hook
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
  } = useBulkSelection(filteredPeople);

  // Bulk operation handlers
  const handleBulkDelete = async () => {
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      const result = await api.bulkDeletePeople(orgId, selectedArray);
      setBulkOperationResult(result);
      if (result.deletedCount > 0) {
        await loadData(false);
      }
    } catch (err) {
      setBulkOperationResult({ deletedCount: 0, failedCount: selectedCount, error: err.message });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkMove = async targetDepartmentId => {
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      const result = await api.bulkMovePeople(orgId, selectedArray, targetDepartmentId);
      setBulkOperationResult(result);
      if (result.movedCount > 0) {
        await loadData(false);
      }
    } catch (err) {
      setBulkOperationResult({ movedCount: 0, failedCount: selectedCount, error: err.message });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkEdit = async updates => {
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      const result = await api.bulkEditPeople(orgId, selectedArray, updates);
      setBulkOperationResult(result);
      if (result.updatedCount > 0) {
        await loadData(false);
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
    if (
      bulkOperationResult?.deletedCount > 0 ||
      bulkOperationResult?.movedCount > 0 ||
      bulkOperationResult?.updatedCount > 0
    ) {
      exitSelectionMode();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - fixed */}
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">People</h1>
              <p className="text-gray-500">Manage people across all departments</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectionMode
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {selectionMode ? <X size={20} /> : <CheckSquare size={20} />}
                {selectionMode ? 'Cancel' : 'Select'}
              </button>
              {!selectionMode && (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Add Person
                </button>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

          {/* Filters - fixed */}
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                {searchLoading ? (
                  <Loader2
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                  />
                ) : (
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                )}
                <input
                  type="text"
                  placeholder="Search by name, title, email, or phone..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE LIST - THIS IS THE KEY PART */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading people...</div>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterDepartment ? 'No people found' : 'No people yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterDepartment
                  ? 'Try adjusting your search or filters'
                  : 'Add your first person to get started'}
              </p>
              {!searchTerm && !filterDepartment && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Add Person
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow">
                {/* Select All header in selection mode */}
                {selectionMode && filteredPeople.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      {allSelected ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} />
                      )}
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                    {hasSelection && (
                      <span className="text-sm text-gray-500">({selectedCount} selected)</span>
                    )}
                  </div>
                )}
                <div className="divide-y divide-gray-200">
                  {filteredPeople.map(person => (
                    <div
                      key={person.id}
                      onClick={selectionMode ? () => toggleSelect(person.id) : undefined}
                      className={`p-6 transition-all duration-300 group ${
                        selectionMode ? 'cursor-pointer' : ''
                      } ${isRecentlyChanged(person.id) ? 'bg-blue-50 ring-2 ring-blue-200' : ''} ${
                        selectionMode && isSelected(person.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox in selection mode */}
                        {selectionMode && (
                          <div className="pt-1">
                            {isSelected(person.id) ? (
                              <CheckSquare size={20} className="text-blue-600" />
                            ) : (
                              <Square size={20} className="text-gray-400" />
                            )}
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{person.name}</h3>
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {person.departmentName}
                            </span>
                          </div>

                          {person.title && (
                            <p className="text-sm text-gray-600 mb-3">{person.title}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {person.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={16} />
                                <a
                                  href={`mailto:${person.email}`}
                                  className="hover:text-blue-600"
                                  onClick={e => selectionMode && e.preventDefault()}
                                >
                                  {person.email}
                                </a>
                              </div>
                            )}
                            {person.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={16} />
                                <span>{person.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions - hide in selection mode */}
                        {!selectionMode && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(person)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit person"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(person)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete person"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results count */}
              {(people.length > 0 || searchTerm.length >= 2) && (
                <div className="mt-4 text-sm text-gray-500 text-center">
                  {searchTerm.length >= 2 ? (
                    <>
                      Found {searchTotal} result{searchTotal !== 1 ? 's' : ''}
                      {filterDepartment && ` (${filteredPeople.length} in selected department)`}
                    </>
                  ) : (
                    <>
                      Showing {filteredPeople.length} of {people.length} people
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Person Form Modal */}
      <PersonForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPerson(null);
        }}
        onSubmit={handleFormSubmit}
        person={editingPerson}
        departments={departments}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPersonToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Person"
        message={`Are you sure you want to delete "${personToDelete?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Bulk Action Bar */}
      {selectionMode && hasSelection && (
        <BulkActionBar
          selectedCount={selectedCount}
          entityType="people"
          onDelete={() => setBulkDeleteModalOpen(true)}
          onMove={() => setBulkMoveModalOpen(true)}
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
        entityType="people"
        isDeleting={bulkOperationLoading}
        result={bulkOperationResult}
      />

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={bulkMoveModalOpen}
        onClose={() => closeBulkModal(setBulkMoveModalOpen)}
        onConfirm={handleBulkMove}
        count={selectedCount}
        departments={departments}
        isMoving={bulkOperationLoading}
        result={bulkOperationResult}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => closeBulkModal(setBulkEditModalOpen)}
        onConfirm={handleBulkEdit}
        count={selectedCount}
        entityType="people"
        departments={departments}
        isUpdating={bulkOperationLoading}
        result={bulkOperationResult}
      />
    </div>
  );
}
