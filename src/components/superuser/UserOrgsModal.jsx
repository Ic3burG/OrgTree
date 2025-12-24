import { X, Building2, Globe, Lock, Crown, Shield, Edit3, Eye } from 'lucide-react';

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-purple-600 bg-purple-100',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-blue-600 bg-blue-100',
  },
  editor: {
    label: 'Editor',
    icon: Edit3,
    color: 'text-green-600 bg-green-100',
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-gray-600 bg-gray-100',
  },
};

export default function UserOrgsModal({ user, onClose }) {
  const totalOrgs = user.organizationCount + user.membershipCount;

  const RoleBadge = ({ role }) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const OrgItem = ({ org, role }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Building2 size={18} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{org.name}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {org.isPublic ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full">
            <Globe size={12} />
            Public
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded-full">
            <Lock size={12} />
            Private
          </span>
        )}
        <RoleBadge role={role} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Organization Access
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {user.name} • {totalOrgs} organization{totalOrgs !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Owned Organizations */}
          {user.ownedOrganizations && user.ownedOrganizations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={18} className="text-purple-600" />
                <h3 className="font-semibold text-gray-900">
                  Owned Organizations
                </h3>
                <span className="text-sm text-gray-500">
                  ({user.ownedOrganizations.length})
                </span>
              </div>
              <div className="space-y-2">
                {user.ownedOrganizations.map((org) => (
                  <OrgItem key={org.id} org={org} role="owner" />
                ))}
              </div>
            </div>
          )}

          {/* Member Organizations */}
          {user.memberships && user.memberships.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  Member Of
                </h3>
                <span className="text-sm text-gray-500">
                  ({user.memberships.length})
                </span>
              </div>
              <div className="space-y-2">
                {user.memberships.map((membership) => (
                  <OrgItem
                    key={membership.id}
                    org={membership}
                    role={membership.role}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalOrgs === 0 && (
            <div className="text-center py-12">
              <Building2 size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">
                This user is not part of any organizations
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Crown size={14} className="text-purple-600" />
                <span>{user.organizationCount} owned</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield size={14} className="text-blue-600" />
                <span>{user.membershipCount} member</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
