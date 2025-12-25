import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import DepartmentForm from './DepartmentForm';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
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
} from 'lucide-react';

export default function DepartmentManager() {
  const { orgId } = useParams();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const loadDepartments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await api.getDepartments(orgId);
      console.log('Loaded departments:', data);
      setDepartments(data);
      // Auto-expand all on initial load
      if (showLoading) {
        setExpanded(new Set(data.map((d) => d.id)));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Real-time updates
  const { isRecentlyChanged } = useRealtimeUpdates(orgId, {
    onDepartmentChange: () => loadDepartments(false),
    onPersonChange: () => loadDepartments(false),
    showNotifications: true
  });

  const handleCreateDept = async (formData) => {
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

  const handleUpdateDept = async (formData) => {
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

  const openEditForm = (dept) => {
    console.log('Opening edit form for:', dept);
    console.log('Current parentId:', dept.parentId);
    setEditingDept(dept);
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  // Build tree structure from flat list
  const buildTree = (depts, parentId = null, depth = 0) => {
    return depts
      .filter((d) => d.parentId === parentId)
      .filter((d) =>
        searchQuery
          ? d.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .map((dept) => ({
        ...dept,
        depth,
        children: buildTree(depts, dept.id, depth + 1),
      }));
  };

  const tree = buildTree(departments);

  const renderDepartment = (dept) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expanded.has(dept.id);
    const peopleCount = dept.people?.length || 0;
    const recentlyChanged = isRecentlyChanged(dept.id);

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg group transition-all duration-300 ${
            recentlyChanged ? 'bg-blue-50 ring-2 ring-blue-200' : ''
          }`}
          style={{ paddingLeft: `${dept.depth * 24 + 12}px` }}
        >
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

          <Building2 size={18} className="text-slate-400" />

          <div className="flex-1">
            <span className="font-medium text-slate-800">{dept.name}</span>
            <span className="ml-2 text-sm text-slate-500">
              <Users size={14} className="inline mr-1" />
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
            </span>
            {dept.parentId && (
              <span className="ml-2 text-xs text-green-600">(has parent)</span>
            )}
          </div>

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
        </div>

        {hasChildren && isExpanded && (
          <div>{dept.children.map(renderDepartment)}</div>
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus size={20} />
          Add Department
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {tree.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No departments yet. Click "Add Department" to create one.
          </div>
        ) : (
          <div className="p-2">{tree.map(renderDepartment)}</div>
        )}
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
    </div>
  );
}
