import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Plus, Users, Building2, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import type { CustomFieldDefinition } from '../../types/index.js';
import CustomFieldForm from './CustomFieldForm';
import DeleteConfirmModal from './DeleteConfirmModal';

interface FieldListProps {
  title: string;
  fields: CustomFieldDefinition[];
  icon: React.ElementType;
  onEdit: (field: CustomFieldDefinition) => void;
  onDelete: (field: CustomFieldDefinition) => void;
  onReorder: (fieldIds: string[]) => Promise<void>;
}

function FieldList({ title, fields, icon: Icon, onEdit, onDelete, onReorder }: FieldListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const dragIndex = fields.findIndex(f => f.id === draggedId);
    const dropIndex = fields.findIndex(f => f.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const newFields = [...fields];
    const [draggedItem] = newFields.splice(dragIndex, 1);
    if (!draggedItem) return; // Type guard
    newFields.splice(dropIndex, 0, draggedItem);

    try {
      setIsReordering(true);
      await onReorder(newFields.map(f => f.id));
    } catch (err) {
      console.error('Failed to reorder fields:', err);
    } finally {
      setIsReordering(false);
      setDraggedId(null);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-opacity ${isReordering ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
        <Icon size={18} className="text-gray-500 dark:text-slate-400" />
        <h3 className="font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-full">
          {fields.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {fields.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400 italic">
              No custom fields defined yet.
            </p>
          </div>
        ) : (
          fields.map(field => (
            <div
              key={field.id}
              draggable
              onDragStart={e => handleDragStart(e, field.id)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, field.id)}
              className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group ${
                draggedId === field.id ? 'opacity-40 bg-blue-50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <GripVertical
                  size={16}
                  className="text-gray-300 dark:text-slate-600 cursor-grab active:cursor-grabbing"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {field.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {field.field_type}
                    </span>
                    {field.is_required && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <code className="text-xs text-gray-500 dark:text-slate-400">
                    {field.field_key}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(field)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                  title="Edit Field"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => onDelete(field)}
                  className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                  title="Delete Field"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CustomFieldsManager(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<CustomFieldDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDefinitions = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomFieldDefinitions(orgId);
      setDefinitions(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  const handleCreate = () => {
    setEditingDefinition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (def: CustomFieldDefinition) => {
    setEditingDefinition(def);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Partial<CustomFieldDefinition>) => {
    if (!orgId) return;
    try {
      setIsSubmitting(true);
      if (editingDefinition) {
        await api.updateCustomFieldDefinition(orgId, editingDefinition.id, formData);
      } else {
        await api.createCustomFieldDefinition(orgId, formData);
      }
      setIsFormOpen(false);
      await loadDefinitions();
    } catch (err) {
      alert((err as Error).message || 'Failed to save custom field');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (def: CustomFieldDefinition) => {
    setFieldToDelete(def);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orgId || !fieldToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteCustomFieldDefinition(orgId, fieldToDelete.id);
      setDeleteModalOpen(false);
      setFieldToDelete(null);
      await loadDefinitions();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete custom field');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReorder = async (fieldIds: string[]) => {
    if (!orgId) return;
    await api.reorderCustomFieldDefinitions(orgId, fieldIds);
    await loadDefinitions();
  };

  const personFields = definitions.filter(d => d.entity_type === 'person');
  const departmentFields = definitions.filter(d => d.entity_type === 'department');

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Custom Fields</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              Extend your organization's data with custom attributes for people and departments.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} />
            Add New Field
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={18} />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full mb-4" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 dark:bg-slate-800 rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FieldList
              title="Person Fields"
              fields={personFields}
              icon={Users}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onReorder={handleReorder}
            />
            <FieldList
              title="Department Fields"
              fields={departmentFields}
              icon={Building2}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onReorder={handleReorder}
            />
          </div>
        )}

        {/* Form Modal */}
        <CustomFieldForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDefinition(null);
          }}
          onSubmit={handleFormSubmit}
          definition={editingDefinition}
          isSubmitting={isSubmitting}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setFieldToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Custom Field"
          message={`Are you sure you want to delete the field "${fieldToDelete?.name}"? All values stored for this field across all entities will be permanently removed.`}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
