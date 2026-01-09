import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, LogOut, Trash2, Edit, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DarkModeToggle from './ui/DarkModeToggle';
import api from '../api/client';
import type { Organization } from '../types/index.js';

export default function OrganizationSelector(): React.JSX.Element {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renamingOrg, setRenamingOrg] = useState<Organization | null>(null);
  const [renameOrgName, setRenameOrgName] = useState<string>('');
  const [renaming, setRenaming] = useState<boolean>(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getOrganizations();
      setOrganizations(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load organizations');
      } else {
        setError('Failed to load organizations');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleCreateOrg = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setCreating(true);
      const newOrg = await api.createOrganization(newOrgName);
      setShowCreateModal(false);
      setNewOrgName('');
      // Navigate directly to the new organization
      navigate(`/org/${newOrg.id}`);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message || 'Failed to create organization');
      } else {
        alert('Failed to create organization');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRenameOrg = (org: Organization): void => {
    setRenamingOrg(org);
    setRenameOrgName(org.name);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!renameOrgName.trim() || !renamingOrg) return;

    try {
      setRenaming(true);
      await api.updateOrganization(renamingOrg.id, renameOrgName.trim());
      setShowRenameModal(false);
      setRenamingOrg(null);
      setRenameOrgName('');
      await loadOrganizations();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message || 'Failed to rename organization');
      } else {
        alert('Failed to rename organization');
      }
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteOrg = async (orgId: string, orgName: string): Promise<void> => {
    if (
      !confirm(
        `Are you sure you want to delete "${orgName}"? This will delete all departments and people in this organization. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.deleteOrganization(orgId);
      await loadOrganizations();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message || 'Failed to delete organization');
      } else {
        alert('Failed to delete organization');
      }
    }
  };

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-gray-500 dark:text-slate-400">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={28} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">OrgTree</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {user?.name}
                </p>
                {user?.role === 'superuser' && (
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                    Superuser
                  </span>
                )}
                {user?.role === 'admin' && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            {user?.role === 'superuser' && (
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
              >
                <Shield size={18} />
                System Admin
              </button>
            )}
            <DarkModeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              Your Organizations
            </h2>
            <p className="text-gray-600 dark:text-slate-400">
              Select an organization to manage or create a new one
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            New Organization
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Organization Grid */}
        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(org => (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-slate-700 overflow-hidden group"
              >
                <div onClick={() => navigate(`/org/${org.id}`)} className="p-6 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Building2 size={24} className="text-blue-600" />
                    </div>
                    {org.role && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          org.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : org.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : org.role === 'editor'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {org.role === 'owner'
                          ? 'Owner'
                          : org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    {org.name}
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    <p>{org.departmentCount || 0} departments</p>
                    {org.createdAt && <p>Created {new Date(org.createdAt).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 px-6 py-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRenameOrg(org);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Rename organization"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteOrg(org.id, org.name);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete organization"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12 text-center">
            <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              No organizations yet
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Create your first organization to get started with OrgTree
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Your First Organization
            </button>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Create New Organization
              </h2>
            </div>
            <form onSubmit={handleCreateOrg}>
              <div className="p-6">
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g., Acme Corporation"
                  autoFocus
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewOrgName('');
                  }}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newOrgName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Organization Modal */}
      {showRenameModal && renamingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Rename Organization
              </h2>
            </div>
            <form onSubmit={handleRenameSubmit}>
              <div className="p-6">
                <label
                  htmlFor="renameOrgName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Organization Name
                </label>
                <input
                  id="renameOrgName"
                  type="text"
                  value={renameOrgName}
                  onChange={e => setRenameOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g., Acme Corporation"
                  autoFocus
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenamingOrg(null);
                    setRenameOrgName('');
                  }}
                  disabled={renaming}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameOrgName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {renaming ? 'Renaming...' : 'Rename Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
