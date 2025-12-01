import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Users,
} from 'lucide-react';
import api from '../../api/client';
import DepartmentForm from './DepartmentForm';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function DepartmentManager() {
  const { orgId } = useParams();
  const [departments, setDepartments] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, [orgId]);

  async function loadDepartments() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDepartments(orgId);
      setDepartments(data);
    } catch (err) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCreate = () => {
    setEditingDepartment(null);
    setIsFormOpen(true);
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingDepartment) {
        await api.updateDepartment(orgId, editingDepartment.id, formData);
      } else {
        await api.createDepartment(orgId, formData);
      }
      setIsFormOpen(false);
      setEditingDepartment(null);
      await loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.deleteDepartment(orgId, departmentToDelete.id);
      setDeleteModalOpen(false);
      setDepartmentToDelete(null);
      await loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to delete department');
    } finally {
      setIsDeleting(false);
    }
  };

  const buildTree = () => {
    const departmentMap = new Map();
    departments.forEach((dept) => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    const tree = [];
    departmentMap.forEach((dept) => {
      if (dept.parent_id) {
        const parent = departmentMap.get(dept.parent_id);
        if (parent) {
          parent.children.push(dept);
        } else {
          tree.push(dept);
        }
      } else {
        tree.push(dept);
      }
    });

    return tree;
  };

  const renderDepartment = (dept, level = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedIds.has(dept.id);
    const peopleCount = dept.people?.length || 0;

    return (
      <div key={dept.id}>
        <div
          className="flex items-center gap-2 p-3 hover:bg-gray-50 rounded-lg group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* Expand/collapse button */}
          <button
            onClick={() => toggleExpand(dept.id)}
            className={`flex-shrink-0 ${
              hasChildren ? 'visible' : 'invisible'
            }`}
          >
            {isExpanded ? (
              <ChevronDown size={20} className="text-gray-600" />
            ) : (
              <ChevronRight size={20} className="text-gray-600" />
            )}
          </button>

          {/* Department info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{dept.name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users size={14} />
                <span>{peopleCount}</span>
              </div>
            </div>
            {dept.description && (
              <p className="text-sm text-gray-500 truncate">
                {dept.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEdit(dept)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit department"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDeleteClick(dept)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Delete department"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>{dept.children.map((child) => renderDepartment(child, level + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading departments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const tree = buildTree();

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Departments
            </h1>
            <p className="text-gray-500">
              Manage your organization's department hierarchy
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Department
          </button>
        </div>

        {/* Department Tree */}
        <div className="bg-white rounded-lg shadow">
          {tree.length > 0 ? (
            <div className="p-4">{tree.map((dept) => renderDepartment(dept))}</div>
          ) : (
            <div className="p-12 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No departments yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first department to get started
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                Add Department
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Department Form Modal */}
      <DepartmentForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDepartment(null);
        }}
        onSubmit={handleFormSubmit}
        department={editingDepartment}
        departments={departments}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDepartmentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Department"
        message={`Are you sure you want to delete "${departmentToDelete?.name}"? This will also delete all people in this department and its subdepartments. This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
