import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  Home,
  Users,
  Building2,
  Map,
  FileText,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Shield,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import MobileNav from '../mobile/MobileNav';
import ConnectionStatus from '../ui/ConnectionStatus';
import DarkModeToggle from '../ui/DarkModeToggle';
import api from '../../api/client';

export default function AdminLayout(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [orgRole, setOrgRole] = useState<string | null>(null);

  // Fetch organization to get user's role
  useEffect(() => {
    async function fetchOrgRole(): Promise<void> {
      if (!orgId) return;

      try {
        await api.getOrganization(orgId);
        // Note: Organization type doesn't have userRole, need to get from members
        // For now, set a default role
        setOrgRole('viewer');
      } catch (err) {
        console.error('Failed to fetch org role:', err);
      }
    }
    fetchOrgRole();
  }, [orgId]);

  // Check if user has admin access (admin or owner in this org)
  const isOrgAdmin = orgRole === 'admin' || orgRole === 'owner';

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  const handleBackToOrgs = (): void => {
    navigate('/');
  };

  const closeSidebar = (): void => {
    setSidebarOpen(false);
  };

  // Sidebar content component (used in both mobile and desktop)
  const SidebarContent = (): React.JSX.Element => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => {
            handleBackToOrgs();
            closeSidebar();
          }}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-2"
        >
          <ArrowLeft size={16} />
          All Organizations
        </button>
        {user?.role === 'superuser' && (
          <NavLink
            to="/admin/users"
            onClick={closeSidebar}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 mb-2"
          >
            <Shield size={16} />
            System Admin
          </NavLink>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Admin Panel</h2>
          <div className="hidden lg:flex items-center gap-2">
            <DarkModeToggle />
            <ConnectionStatus />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <NavLink
          to={`/org/${orgId}`}
          end
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`
          }
        >
          <Home size={20} />
          <span className="font-medium">Dashboard</span>
        </NavLink>

        <NavLink
          to={`/org/${orgId}/departments`}
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`
          }
        >
          <Building2 size={20} />
          <span className="font-medium">Departments</span>
        </NavLink>

        <NavLink
          to={`/org/${orgId}/people`}
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`
          }
        >
          <Users size={20} />
          <span className="font-medium">People</span>
        </NavLink>

        <NavLink
          to={`/org/${orgId}/map`}
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`
          }
        >
          <Map size={20} />
          <span className="font-medium">Organization Map</span>
        </NavLink>

        {isOrgAdmin && (
          <NavLink
            to={`/org/${orgId}/audit`}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`
            }
          >
            <FileText size={20} />
            <span className="font-medium">Audit Log</span>
          </NavLink>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                {user?.name}
              </p>
              {user?.role === 'superuser' && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium flex-shrink-0">
                  Superuser
                </span>
              )}
              {user?.role === 'admin' && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium flex-shrink-0">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <NavLink
          to="/settings"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-4 py-2 rounded-lg mb-2 transition-colors ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`
          }
        >
          <Settings size={18} />
          <span className="font-medium text-sm">Account Settings</span>
        </NavLink>
        <button
          onClick={() => {
            handleLogout();
            closeSidebar();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile header with hamburger */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-800 shadow-sm z-40 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-gray-700 dark:text-slate-300" />
          </button>
          <h1 className="ml-3 text-lg font-semibold text-gray-900 dark:text-slate-100">OrgTree</h1>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <ConnectionStatus />
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={closeSidebar} />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-800 shadow-xl flex flex-col animate-slide-in-left">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Menu</h2>
              <button
                onClick={closeSidebar}
                className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X size={24} className="text-gray-700 dark:text-slate-300" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-800 shadow-lg flex-col border-r border-gray-200 dark:border-slate-700">
        <SidebarContent />
      </aside>

      {/* Main content - adjust padding for mobile header and bottom nav */}
      <main className="lg:ml-64 pt-14 lg:pt-0 pb-16 lg:pb-0 h-screen overflow-hidden">
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
