import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { User, Shield, Monitor, ArrowLeft } from 'lucide-react';

export default function AccountLayout(): React.JSX.Element {
  const navigate = useNavigate();

  const tabs = [
    { id: 'profile', label: 'General', icon: User, path: '/settings' },
    { id: 'preferences', label: 'Interface', icon: Monitor, path: '/settings/preferences' },
    { id: 'security', label: 'Security', icon: Shield, path: '/settings/security' },
    { id: 'sessions', label: 'Active Sessions', icon: Monitor, path: '/settings/sessions' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Account Settings
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage your account info, security, and active sessions.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.path === '/settings'}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`
                }
              >
                <tab.icon size={18} />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 sm:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
