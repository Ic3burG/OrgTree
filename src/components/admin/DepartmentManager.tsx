/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import DepartmentForm from './DepartmentForm';
import DeleteConfirmModal from './DeleteConfirmModal';
import BulkActionBar from './BulkActionBar';
import BulkDeleteModal from './BulkDeleteModal';
import BulkEditModal from './BulkEditModal';
import DepartmentManagerHeader from './DepartmentManagerHeader';
import DepartmentList from './DepartmentList';
import type { DepartmentWithDepth } from './DepartmentItem';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { useSearch } from '../../hooks/useSearch';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useDepartments } from '../../hooks/useDepartments';
import type { Department, BulkOperationResult } from '../../types/index.js';

// Build tree structure from flat list
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

  // UI State
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showDelete, setShowDelete] = useState<boolean>(false);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Search hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    loading: searchLoading,
    total: searchTotal,
  } = useSearch(orgId, { debounceMs: 300, minQueryLength: 2, defaultType: 'departments' });

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

  // Use custom hook for data management
  const {
    departments,
    fieldDefinitions,
    loading,
    error: hookError,
    loadDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments(orgId);

  // Auto-expand all on initial load
  useEffect(() => {
    if (departments.length > 0 && expanded.size === 0) {
      setExpanded(new Set(departments.map((d: Department) => d.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments]); // Only run when departments load mostly

  // Sync hook error to local error specific to other ops if needed
  const displayError = error || hookError;

  // Real-time updates
  const { isRecentlyChanged } = useRealtimeUpdates(orgId, {
    onDepartmentChange: () => loadDepartments(false),
    onPersonChange: () => loadDepartments(false),
    onCustomFieldDefinitionChange: () => loadDepartments(false),
    showNotifications: true,
  });

  const handleCreateDept = async (formData: {
    name: string;
    description: string;
    parentId: string | null;
    customFields: Record<string, string | null>;
  }): Promise<void> => {
    if (!orgId) return;
    setFormLoading(true);
    setError('');
    try {
      await createDepartment(formData);
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDept = async (formData: {
    name: string;
    description: string;
    parentId: string | null;
    customFields: Record<string, string | null>;
  }): Promise<void> => {
    if (!orgId || !editingDept) return;
    setFormLoading(true);
    setError('');
    try {
      await updateDepartment(editingDept.id, formData);
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
      await deleteDepartment(deletingDept.id);
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

  const openEditForm = useCallback((dept: Department): void => {
    setEditingDept(dept);
    setShowForm(true);
  }, []);

  const openDeleteModal = useCallback((dept: Department): void => {
    setDeletingDept(dept);
    setShowDelete(true);
  }, []);

  const toggleExpand = useCallback((id: string): void => {
    setExpanded(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  const tree = useMemo(() => buildTree(departments), [departments]);

  // Determine if we're in search mode
  const isSearching = searchQuery.length >= 2;

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DepartmentManagerHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectionMode={selectionMode}
        onToggleSelectionMode={toggleSelectionMode}
        onAddDepartment={openCreateForm}
        searchLoading={searchLoading}
        searchTotal={searchTotal}
        isSearching={isSearching}
      />

      {displayError && (
        <div className="px-8 pb-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {displayError}
          </div>
        </div>
      )}

      <DepartmentList
        loading={loading}
        departments={selectionMode ? departments : tree}
        isSearching={isSearching}
        searchQuery={searchQuery}
        hasSelection={hasSelection}
        selectedCount={selectedCount}
        selectionMode={selectionMode}
        allSelected={allSelected}
        toggleSelectAll={toggleSelectAll}
        expanded={expanded}
        toggleExpand={toggleExpand}
        isSelected={isSelected}
        toggleSelect={toggleSelect}
        onEdit={openEditForm}
        onDelete={openDeleteModal}
        isRecentlyChanged={isRecentlyChanged}
        searchResults={searchResults}
        fieldDefinitions={fieldDefinitions}
      />

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
