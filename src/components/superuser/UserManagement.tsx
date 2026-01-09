import React, { useEffect, useState } from 'react';
import { Search, Edit, Trash2, Key, Users, UserPlus, Crown, Shield } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import UserForm from './UserForm';
import ResetPasswordModal from './ResetPasswordModal';
import CreateUserModal from './CreateUserModal';
import DeleteConfirmModal from '../admin/DeleteConfirmModal';
import UserOrgsModal from './UserOrgsModal';
import type { User } from '../../types';

// Extended User type with organization counts
interface UserWithCounts extends User {
  organizationCount: number;
  membershipCount: number;
  ownedOrganizations?: Array<{ id: string; name: string; is_public: boolean }>;
  memberships?: Array<{ id: string; name: string; role: string }>;
  createdAt?: string;
}

interface UserFormData {
  name: string;
  email: string;
  role: User['role'];
}

const ROLE_COLORS: Record<User['role'], string> = {
  superuser: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  user: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS: Record<User['role'], string> = {
  superuser: 'Superuser',
  admin: 'Admin',
  user: 'User',
};

export default function UserManagement(): React.JSX.Element {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserWithCounts | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Password reset modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordResetUser, setPasswordResetUser] = useState<UserWithCounts | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Create user modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // User orgs modal state
  const [orgsModalUser, setOrgsModalUser] = useState<UserWithCounts | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState<boolean>(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Fetch full user details including organizations when opening modal
  const handleViewOrgs = async (user: UserWithCounts): Promise<void> => {
    try {
      setLoadingOrgs(true);
      const fullUserData = (await api.getUser(user.id)) as UserWithCounts;
      setOrgsModalUser(fullUserData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load organization details';
      alert(errorMessage);
    } finally {
      setLoadingOrgs(false);
    }
  };

  async function loadUsers(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const data = (await api.getUsers()) as UserWithCounts[];
      setUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (user: UserWithCounts): void => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: UserFormData): Promise<void> => {
    if (!editingUser) return;

    try {
      setIsSubmitting(true);

      // Update user details
      if (formData.name !== editingUser.name || formData.email !== editingUser.email) {
        await api.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
        });
      }

      // Update role if changed
      if (formData.role !== editingUser.role) {
        await api.updateUserRole(editingUser.id, formData.role);
      }

      setIsFormOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = (user: UserWithCounts): void => {
    setPasswordResetUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleDeleteClick = (user: UserWithCounts): void => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await api.deleteUser(userToDelete.id);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user: UserWithCounts) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={28} className="text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              User Management
            </h1>
            <span className="px-2 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              {users.length} users
            </span>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <UserPlus size={20} />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100"
        >
          <option value="">All Roles</option>
          <option value="superuser">Superuser</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-slate-400">
            {searchTerm || filterRole ? 'No users match your search' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Organizations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.map((user: UserWithCounts) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-700">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {user.name}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-purple-600">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ROLE_COLORS[user.role]
                      }`}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm hidden sm:table-cell">
                    <button
                      onClick={() => handleViewOrgs(user)}
                      disabled={loadingOrgs}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
                      title="View organization details"
                    >
                      {user.organizationCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-purple-700">
                          <Crown size={14} />
                          <span className="font-medium">{user.organizationCount}</span>
                        </span>
                      )}
                      {user.membershipCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-blue-700">
                          <Shield size={14} />
                          <span className="font-medium">{user.membershipCount}</span>
                        </span>
                      )}
                      {user.organizationCount === 0 && user.membershipCount === 0 && (
                        <span className="text-gray-400">None</span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 hidden md:table-cell">
                    {new Date(user.createdAt || user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handlePasswordReset(user)}
                        className="p-2 text-gray-600 dark:text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                        title="Reset password"
                      >
                        <Key size={16} />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {isFormOpen && (
        <UserForm
          user={editingUser}
          currentUserId={currentUser?.id}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingUser(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Reset Password Modal */}
      {isPasswordModalOpen && (
        <ResetPasswordModal
          user={passwordResetUser}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPasswordResetUser(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          title="Delete User"
          message={`Are you sure you want to delete "${userToDelete?.name}"? This will also delete all their organizations, departments, and people. This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false);
            setUserToDelete(null);
          }}
          isDeleting={isDeleting}
        />
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadUsers();
          }}
        />
      )}

      {/* User Organizations Modal */}
      {orgsModalUser && (
        <UserOrgsModal user={orgsModalUser} onClose={() => setOrgsModalUser(null)} />
      )}
    </div>
  );
}
