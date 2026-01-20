import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import PersonForm from './PersonForm';
import DeleteConfirmModal from './DeleteConfirmModal';
import BulkActionBar from './BulkActionBar';
import BulkDeleteModal from './BulkDeleteModal';
import BulkMoveModal from './BulkMoveModal';
import BulkEditModal from './BulkEditModal';
import PersonManagerHeader from './PersonManagerHeader';
import PersonList from './PersonList';
import type { PersonWithDepartmentName } from './PersonItem';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { useSearch } from '../../hooks/useSearch';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import type {
  Person,
  Department,
  Organization,
  BulkOperationResult,
  CustomFieldDefinition,
} from '../../types/index.js';

export default function PersonManager(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [people, setPeople] = useState<PersonWithDepartmentName[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStarred, setFilterStarred] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<'name' | 'department' | 'title' | 'created_at'>(
    'name'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Use the search hook for API-based search
  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    results: searchResults,
    loading: searchLoading,
    total: searchTotal,
  } = useSearch(orgId, { debounceMs: 300, minQueryLength: 2, defaultType: 'people' });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithDepartmentName | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [personToDelete, setPersonToDelete] = useState<PersonWithDepartmentName | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Bulk operations state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState<boolean>(false);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState<boolean>(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState<boolean>(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState<boolean>(false);
  const [bulkOperationResult, setBulkOperationResult] = useState<BulkOperationResult | null>(null);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    deletedCount: number;
    failedCount: number;
    errors?: Array<{ id: string; error: string }>;
  } | null>(null);
  const [bulkMoveResult, setBulkMoveResult] = useState<{
    movedCount: number;
    failedCount: number;
  } | null>(null);
  const [bulkEditResult, setBulkEditResult] = useState<{
    updatedCount: number;
    failedCount: number;
  } | null>(null);

  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);

  const loadData = useCallback(
    async (showLoading = true): Promise<void> => {
      if (!orgId) return;
      try {
        if (showLoading) setLoading(true);
        setError(null);

        // Load organization with all departments and people
        const orgData: Organization & { departments?: Department[] } =
          await api.getOrganization(orgId);
        setDepartments(orgData.departments || []);

        // Load custom field definitions
        const defs = await api.getCustomFieldDefinitions(orgId);
        setFieldDefinitions(defs.filter(d => d.entity_type === 'person'));

        // Flatten people from all departments
        const allPeople: PersonWithDepartmentName[] = [];
        (orgData.departments || []).forEach((dept: Department) => {
          (dept.people || []).forEach((person: Person) => {
            allPeople.push({
              ...person,
              departmentName: dept.name,
            });
          });
        });
        setPeople(allPeople);
      } catch (err) {
        setError((err as Error).message || 'Failed to load data');
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
    onCustomFieldDefinitionChange: () => loadData(false),
    showNotifications: true,
  });

  const handleCreate = (): void => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleEdit = useCallback((person: PersonWithDepartmentName): void => {
    setEditingPerson(person);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = async (formData: {
    name: string;
    title: string;
    email: string;
    phone: string;
    departmentId: string;
    isStarred: boolean;
    customFields: Record<string, string | null>;
  }): Promise<void> => {
    try {
      setIsSubmitting(true);
      const personData = {
        name: formData.name,
        title: formData.title,
        email: formData.email,
        phone: formData.phone,
        department_id: formData.departmentId,
        is_starred: formData.isStarred,
        custom_fields: formData.customFields,
      };

      if (editingPerson) {
        await api.updatePerson(editingPerson.id, personData);
      } else {
        await api.createPerson(formData.departmentId, personData);
      }
      setIsFormOpen(false);
      setEditingPerson(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message || 'Failed to save person');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = useCallback((person: PersonWithDepartmentName): void => {
    setPersonToDelete(person);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!personToDelete) return;
    try {
      setIsDeleting(true);
      await api.deletePerson(personToDelete.id);
      setDeleteModalOpen(false);
      setPersonToDelete(null);
      await loadData();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete person');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine which list to filter and sort
  const filteredPeople = useMemo(() => {
    // 1. Base list (API search results or all people)
    let list: PersonWithDepartmentName[] =
      searchTerm.length >= 2 ? (searchResults as unknown as PersonWithDepartmentName[]) : people;

    // 2. Filter by department (local)
    if (filterDepartment) {
      list = list.filter(
        (person: PersonWithDepartmentName) => person.department_id === filterDepartment
      );
    }

    // 3. Filter by starred (local)
    if (filterStarred) {
      list = list.filter((person: PersonWithDepartmentName) => person.is_starred);
    }

    // 4. Sort (local)
    return [...list].sort((a, b) => {
      let valA: string | number | null | undefined;
      let valB: string | number | null | undefined;

      switch (sortField) {
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'department':
          // Handle both camelCase (from people list) and snake_case (from search results)
          valA =
            a.departmentName ||
            (a as PersonWithDepartmentName & { department_name?: string }).department_name ||
            '';
          valB =
            b.departmentName ||
            (b as PersonWithDepartmentName & { department_name?: string }).department_name ||
            '';
          break;
        case 'title':
          valA = a.title || '';
          valB = b.title || '';
          break;
        case 'created_at':
          // Handle potential missing created_at in search results
          valA = a.created_at || '';
          valB = b.created_at || '';
          break;
        default:
          valA = a.name;
          valB = b.name;
      }

      // Handle null/undefined
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      // Case-insensitive string comparison
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    searchTerm,
    searchResults,
    people,
    filterDepartment,
    filterStarred,
    sortField,
    sortDirection,
  ]);

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
  const handleBulkDelete = async (): Promise<void> => {
    if (!orgId) return;
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      setBulkDeleteResult(null);
      const result = await api.bulkDeletePeople(orgId, selectedArray);
      setBulkOperationResult(result);
      setBulkDeleteResult({
        deletedCount: result.deletedCount ?? 0,
        failedCount: result.failedCount ?? 0,
        errors: result.failed,
      });
      if ((result.deletedCount ?? 0) > 0) {
        await loadData(false);
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

  const handleBulkMove = async (targetDepartmentId: string): Promise<void> => {
    if (!orgId) return;
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      setBulkMoveResult(null);
      const result = await api.bulkMovePeople(orgId, selectedArray, targetDepartmentId);
      setBulkOperationResult(result);
      setBulkMoveResult({
        movedCount: result.movedCount ?? 0,
        failedCount: result.failedCount ?? 0,
      });
      if ((result.movedCount ?? 0) > 0) {
        await loadData(false);
      }
    } catch (err) {
      setBulkOperationResult({
        success: 0,
        failed: [{ id: 'bulk', error: (err as Error).message }],
        errors: [{ id: 'bulk', error: (err as Error).message }],
      });
      setBulkMoveResult({ movedCount: 0, failedCount: selectedCount });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkEdit = async (updates: {
    title?: string;
    departmentId?: string;
    customFields?: Record<string, string | null>;
  }): Promise<void> => {
    if (!orgId) return;
    try {
      setBulkOperationLoading(true);
      setBulkOperationResult(null);
      setBulkEditResult(null);
      const result = await api.bulkEditPeople(orgId, selectedArray, updates);
      setBulkOperationResult(result);
      setBulkEditResult({
        updatedCount: result.updatedCount ?? 0,
        failedCount: result.failedCount ?? 0,
      });
      if ((result.updatedCount ?? 0) > 0) {
        await loadData(false);
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
    setBulkMoveResult(null);
    setBulkEditResult(null);
    if (bulkOperationResult && bulkOperationResult.success > 0) {
      exitSelectionMode();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PersonManagerHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterDepartment={filterDepartment}
        onFilterChange={setFilterDepartment}
        filterStarred={filterStarred}
        onFilterStarredChange={setFilterStarred}
        departments={departments}
        selectionMode={selectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        onAddPerson={handleCreate}
        searchLoading={searchLoading}
        error={error}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
      />

      <PersonList
        people={filteredPeople}
        totalPeopleCount={people.length}
        loading={loading}
        searchTerm={searchTerm}
        filterDepartment={filterDepartment}
        searchTotal={searchTotal}
        onAddPerson={handleCreate}
        selectionMode={selectionMode}
        hasSelection={hasSelection}
        selectedCount={selectedCount}
        allSelected={allSelected}
        toggleSelectAll={toggleSelectAll}
        isSelected={isSelected}
        toggleSelect={toggleSelect}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isRecentlyChanged={isRecentlyChanged}
        fieldDefinitions={fieldDefinitions}
      />

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
        result={bulkDeleteResult}
      />

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={bulkMoveModalOpen}
        onClose={() => closeBulkModal(setBulkMoveModalOpen)}
        onConfirm={handleBulkMove}
        count={selectedCount}
        departments={departments}
        isMoving={bulkOperationLoading}
        result={bulkMoveResult}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={bulkEditModalOpen}
        onClose={() => closeBulkModal(setBulkEditModalOpen)}
        onConfirm={handleBulkEdit}
        count={selectedCount}
        entityType="people"
        departments={departments}
        fieldDefinitions={fieldDefinitions}
        isUpdating={bulkOperationLoading}
        result={bulkEditResult}
      />
    </div>
  );
}
