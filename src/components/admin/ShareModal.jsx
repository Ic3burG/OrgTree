import { useState, useEffect } from 'react';
import { X, Link2, RefreshCw, Copy, Check, Globe, Lock, Users, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';
import AddMemberModal from './AddMemberModal';

export default function ShareModal({ orgId, orgName, onClose }) {
  const [activeTab, setActiveTab] = useState('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const toast = useToast();

  // Load share settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const settings = await api.getShareSettings(orgId);
        setIsPublic(settings.isPublic);
        setShareUrl(settings.shareUrl || '');
      } catch (err) {
        console.error('Failed to load share settings:', err);
        toast.error('Failed to load share settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId, toast]);

  // Load members when Team Members tab is active
  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
    }
  }, [activeTab, orgId]);

  async function loadMembers() {
    try {
      setLoadingMembers(true);
      console.log('Loading members for orgId:', orgId);
      const data = await api.getOrgMembers(orgId);
      console.log('Loaded members:', data);
      setOwner(data.owner);
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to load members:', err);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  }

  // Toggle public/private
  const handleTogglePublic = async () => {
    try {
      setSaving(true);
      const newIsPublic = !isPublic;
      const result = await api.updateShareSettings(orgId, newIsPublic);
      setIsPublic(result.isPublic);
      setShareUrl(result.shareUrl || '');
      toast.success(newIsPublic ? 'Organization is now public' : 'Organization is now private');
    } catch (err) {
      console.error('Failed to update share settings:', err);
      toast.error('Failed to update share settings');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate share token
  const handleRegenerateToken = async () => {
    if (!confirm('This will invalidate the current link. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      const result = await api.regenerateShareToken(orgId);
      setShareUrl(result.shareUrl);
      toast.success('Share link regenerated successfully');
    } catch (err) {
      console.error('Failed to regenerate share token:', err);
      toast.error('Failed to regenerate share link');
    } finally {
      setSaving(false);
    }
  };

  // Copy share URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  };

  // Add member
  const handleAddMember = async (userId, role) => {
    try {
      await api.addOrgMember(orgId, userId, role);
      toast.success('Member added successfully');
      loadMembers();
    } catch (err) {
      console.error('Failed to add member:', err);
      toast.error(err.message || 'Failed to add member');
      throw err;
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await api.updateMemberRole(orgId, memberId, newRole);
      toast.success('Role updated successfully');
      loadMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
      toast.error('Failed to update role');
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from this organization?`)) {
      return;
    }

    try {
      await api.removeMember(orgId, memberId);
      toast.success('Member removed successfully');
      loadMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast.error('Failed to remove member');
    }
  };

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Role badge colors
  const getRoleBadgeColor = (role) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      editor: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.viewer;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link2 className="text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Share Organization</h2>
                <p className="text-sm text-slate-600 mt-1">{orgName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('public')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'public'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe size={18} />
                Public Link
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'members'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={18} />
                Team Members
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'public' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Public/Private Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {isPublic ? (
                          <Globe className="text-green-600" size={20} />
                        ) : (
                          <Lock className="text-slate-500" size={20} />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">
                            {isPublic ? 'Public' : 'Private'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {isPublic
                              ? 'Anyone with the link can view'
                              : 'Only team members can view'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleTogglePublic}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          isPublic ? 'bg-blue-600' : 'bg-slate-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isPublic ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Share Link */}
                    {isPublic && shareUrl && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                          Share Link
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-sm font-mono"
                          />
                          <button
                            onClick={handleCopyUrl}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            {copied ? (
                              <>
                                <Check size={18} />
                                <span className="hidden sm:inline">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={18} />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Regenerate Token */}
                        <button
                          onClick={handleRegenerateToken}
                          disabled={saving}
                          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={16} />
                          Regenerate link
                        </button>
                      </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        {isPublic ? (
                          <>
                            <strong>Public sharing is enabled.</strong> Anyone with the link can view
                            this organization chart in read-only mode.
                          </>
                        ) : (
                          <>
                            <strong>Private mode.</strong> Enable public sharing to generate a shareable
                            link that anyone can use to view this organization chart.
                          </>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-4">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Add Member Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          console.log('Opening Add Member modal for orgId:', orgId);
                          setShowAddMember(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Users size={18} />
                        Add Member
                      </button>
                    </div>

                    {/* Owner */}
                    {owner && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                              {getInitials(owner.userName)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{owner.userName}</div>
                              <div className="text-sm text-gray-500">{owner.userEmail}</div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor('owner')}`}>
                            Owner
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    {members.length > 0 ? (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700">Members</h3>
                        {members.map((member) => (
                          <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                  {getInitials(member.userName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{member.userName}</div>
                                  <div className="text-sm text-gray-500 truncate">{member.userEmail}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="editor">Editor</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.userName)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Users size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No team members yet</p>
                        <p className="text-sm mt-1">Add members to collaborate on this organization</p>
                      </div>
                    )}

                    {/* Permission Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Permission Levels:</strong>
                      </p>
                      <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Viewer:</strong> Can view the organization</li>
                        <li><strong>Editor:</strong> Can create, edit, and delete departments and people</li>
                        <li><strong>Admin:</strong> Can manage members and settings</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        onAdd={handleAddMember}
        orgId={orgId}
      />
    </>
  );
}
