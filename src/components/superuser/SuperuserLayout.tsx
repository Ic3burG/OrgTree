import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, FileText, LogOut, ArrowLeft, Menu, X, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import MobileNav from '../mobile/MobileNav';
import DarkModeToggle from '../ui/DarkModeToggle';
import Sidebar from '../ui/Sidebar';
import { useSidebar } from '../../hooks/useSidebar';

export default function SuperuserLayout(): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use the new hook for sidebar state
  // Use a different storage key for superuser layout to keep states independent
  const { state, width, pinned, setState, setWidth, setPinned, isExpanded, isMinimized, isHidden } =
    useSidebar({
      storageKey: 'superuserSidebarState',
      widthStorageKey: 'superuserSidebarWidth',
      pinnedStorageKey: 'superuserSidebarPinned',
    });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToOrgs = () => {
    navigate('/');
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const SidebarHeader = (
    <div className="w-full">
      <button
        onClick={() => {
          handleBackToOrgs();
          closeSidebar();
        }}
        className={`w-full flex items-center ${!isExpanded ? 'justify-center' : 'gap-2'} text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-2 transition-all`}
        title={!isExpanded ? 'Back to Organizations' : undefined}
      >
        <ArrowLeft size={16} />
        {isExpanded && <span>Back to Organizations</span>}
      </button>
      <div className="flex items-center justify-between mt-2">
        <div className={`flex items-center ${!isExpanded ? 'justify-center w-full' : 'gap-2'}`}>
          <Shield size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
          {isExpanded && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 whitespace-nowrap">
              System Admin
            </h2>
          )}
        </div>
        {isExpanded && <DarkModeToggle />}
      </div>
      {!isExpanded && (
        <div className="flex justify-center mt-4">
          <DarkModeToggle />
        </div>
      )}
    </div>
  );

  const Navigation = (
    <nav className="p-2 space-y-1">
      <NavLink
        to="/admin/users"
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'User Management' : undefined}
      >
        <Users size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>User Management</span>
      </NavLink>

      <NavLink
        to="/admin/audit"
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'System Audit Logs' : undefined}
      >
        <FileText size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>System Audit Logs</span>
      </NavLink>

      <NavLink
        to="/admin/metrics"
        onClick={closeSidebar}
        className={({ isActive }) =>
          `flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`
        }
        title={!isExpanded ? 'System Metrics' : undefined}
      >
        <BarChart3 size={20} />
        <span className={`font-medium ${!isExpanded ? 'sr-only' : ''}`}>System Metrics</span>
      </NavLink>
    </nav>
  );

  const SidebarFooter = (
    <div className="w-full">
      <div className={`flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} mb-2`}>
        <div
          className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0"
          title={!isExpanded ? user?.name : undefined}
        >
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                {user?.name}
              </p>
              <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium flex-shrink-0">
                Superuser
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        )}
      </div>
      <button
        onClick={() => {
          handleLogout();
          closeSidebar();
        }}
        className={`w-full flex items-center ${!isExpanded ? 'justify-center' : 'justify-center gap-2'} px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors`}
        title="Logout"
      >
        <LogOut size={16} />
        {isExpanded && <span>Logout</span>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-800 shadow-sm z-40 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-gray-700 dark:text-slate-300" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Shield size={20} className="text-purple-600 dark:text-purple-400" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              System Admin
            </h1>
          </div>
        </div>
        <DarkModeToggle />
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={closeSidebar} />
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
            <div className="flex-1 overflow-y-auto">
              {SidebarHeader}
              {Navigation}
            </div>
            {SidebarFooter}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
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

      {/* Main content */}
      <main
        className="pt-14 lg:pt-0 min-h-screen transition-[margin] duration-300 ease-in-out"
        style={{ marginLeft: isHidden ? 0 : isMinimized ? 64 : width }}
      >
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
