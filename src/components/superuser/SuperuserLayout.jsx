import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, FileText, LogOut, ArrowLeft, Menu, X, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SuperuserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => {
            handleBackToOrgs();
            closeSidebar();
          }}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft size={16} />
          Back to Organizations
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">System Admin</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <NavLink
          to="/admin/users"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
            }`
          }
        >
          <Users size={20} />
          <span className="font-medium">User Management</span>
        </NavLink>

        <NavLink
          to="/admin/audit"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
            }`
          }
        >
          <FileText size={20} />
          <span className="font-medium">System Audit Logs</span>
        </NavLink>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-purple-700">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium flex-shrink-0">
                Superuser
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            handleLogout();
            closeSidebar();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-40 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-gray-700" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <Shield size={20} className="text-purple-600" />
          <h1 className="text-lg font-semibold text-gray-900">System Admin</h1>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={closeSidebar} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={closeSidebar}
                className="p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X size={24} className="text-gray-700" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg flex-col border-r border-gray-200">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
