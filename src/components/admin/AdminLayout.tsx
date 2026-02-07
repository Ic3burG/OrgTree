import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  Home,
  Users,
  Building2,
  Map,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Settings,
  Terminal,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import MobileNav from '../mobile/MobileNav';
import ConnectionStatus from '../ui/ConnectionStatus';
import DarkModeToggle from '../ui/DarkModeToggle';
import Sidebar from '../ui/Sidebar';
import { useSidebar } from '../../hooks/useSidebar';

export default function AdminLayout(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Use the new hook for sidebar state
  const { state, width, pinned, setState, setWidth, setPinned, isExpanded, isMinimized, isHidden } =
    useSidebar();

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  const handleBackToOrgs = (): void => {
    navigate('/');
  };

  const closeSidebar = (): void => {
    // Mobile: Always close drawer
    setSidebarOpen(false);

    // Desktop: Auto-collapse if not pinned and currently expanded
    if (!pinned && isExpanded) {
      setState('minimized');
    }
  };

  // Header content for the Sidebar
  const SidebarHeader = (
    <div className="w-full">
      <button
        onClick={() => {
          handleBackToOrgs();
          closeSidebar();
        }}
        className={`w-full flex items-center ${!isExpanded ? 'justify-center' : 'gap-2 pr-12'} text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-2 transition-all`}
        title={!isExpanded ? 'All Organizations' : undefined}
      >
        <ArrowLeft size={16} />
        {isExpanded && <span>All Organizations</span>}
      </button>
      {user?.role === 'superuser' && (
        <NavLink
          to="/admin/users"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `w-full flex items-center ${!isExpanded ? 'justify-center' : 'gap-2'} text-sm text-purple-600 hover:text-purple-800 mb-2 transition-all ${
              isActive ? 'font-semibold' : ''
            }`
          }
          title={!isExpanded ? 'System Admin' : undefined}
        >
          <Terminal size={16} />
          {isExpanded && <span>System Admin</span>}
        </NavLink>
      )}
      <div className="flex items-center justify-between mt-2">
        <h2
          className={`text-lg font-semibold text-gray-900 dark:text-slate-100 ${!isExpanded ? 'sr-only' : ''}`}
        >
          Admin Panel
        </h2>
        {/* Controls shown in header when expanded */}
        {isExpanded && (
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <ConnectionStatus />
          </div>
        )}
      </div>
      {/* Controls shown vertically when minimized */}
      {!isExpanded && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <DarkModeToggle />
          <ConnectionStatus />
        </div>
      )}
    </div>
  );

  // Footer content for the Sidebar
  const SidebarFooter = (
    <div className="w-full">
      <div className={`flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} mb-2`}>
        <div
          className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0"
          title={!isExpanded ? user?.name : undefined}
        >
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        {isExpanded && (
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
        )}
      </div>
      <NavLink
        to="/settings"
        onClick={closeSidebar}
        className={({ isActive }) =>
          `w-full flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg mb-2 transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title="Account Settings"
      >
        <Settings size={18} />
        <span className={`font-medium text-sm ${!isExpanded ? 'sr-only' : ''}`}>
          Account Settings
        </span>
      </NavLink>
      <button
        onClick={() => {
          handleLogout();
          closeSidebar();
        }}
        className={`w-full flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors`}
        title="Logout"
      >
        <LogOut size={18} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>Logout</span>
      </button>
    </div>
  );

  // Navigation Links
  const Navigation = (
    <nav className="p-2 space-y-1">
      <NavLink
        to={`/org/${orgId}`}
        end
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'Dashboard' : undefined}
      >
        <Home size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>Dashboard</span>
      </NavLink>

      <NavLink
        to={`/org/${orgId}/departments`}
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'Departments' : undefined}
      >
        <Building2 size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>Departments</span>
      </NavLink>

      <NavLink
        to={`/org/${orgId}/people`}
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'People' : undefined}
      >
        <Users size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>People</span>
      </NavLink>

      <NavLink
        to={`/org/${orgId}/map`}
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'Organization Map' : undefined}
      >
        <Map size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>Organization Map</span>
      </NavLink>

      <NavLink
        to={`/org/${orgId}/settings`}
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'Settings' : undefined}
      >
        <Settings size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>Settings</span>
      </NavLink>
      <NavLink
        to={`/org/${orgId}/analytics`}
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'Analytics' : undefined}
      >
        <BarChart3 size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>Analytics</span>
      </NavLink>
    </nav>
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
          {/* Drawer - Simplified for mobile */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-800 shadow-xl flex flex-col animate-slide-in-left">
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
            {/* Reuse navigation logic but force expanded style for mobile */}
            <div className="flex-1 overflow-y-auto">
              {SidebarHeader}
              {Navigation}
            </div>
            {SidebarFooter}
          </aside>
        </div>
      )}

      {/* Desktop sidebar - New Enhanced Component */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-30">
        <Sidebar
          state={state}
          width={width}
          pinned={pinned}
          onStateChange={setState}
          onWidthChange={setWidth}
          onPinnedChange={setPinned}
          header={SidebarHeader}
          navigation={Navigation}
          footer={SidebarFooter}
        />
      </div>

      {/* Main content - Dynamic margin based on sidebar state */}
      <main
        className="pt-14 lg:pt-0 pb-16 lg:pb-0 h-dvh overflow-hidden transition-[margin] duration-300 ease-in-out"
        style={{ marginLeft: isHidden ? 0 : isMinimized ? 64 : width }}
      >
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
