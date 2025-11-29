import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { Home, Users, Building2, Map, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
  const { orgId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToOrgs = () => {
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleBackToOrgs}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={16} />
            All Organizations
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <NavLink
            to={`/org/${orgId}`}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to={`/org/${orgId}/departments`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Building2 size={20} />
            <span className="font-medium">Departments</span>
          </NavLink>

          <NavLink
            to={`/org/${orgId}/people`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Users size={20} />
            <span className="font-medium">People</span>
          </NavLink>

          <NavLink
            to={`/org/${orgId}/map`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Map size={20} />
            <span className="font-medium">Organization Map</span>
          </NavLink>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
