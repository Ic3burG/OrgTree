/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Link2, RefreshCw, Copy, Check, Globe, Lock, Users, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';
import AddMemberModal from './AddMemberModal';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { getInitials } from '../../utils/helpers';
import type { OrgMember, Invitation, ShareSettings } from '../../types/index.js';

interface ShareModalProps {
  orgId: string;
  orgName: string;
  role?: string;
  onClose: () => void;
}

interface OrgMemberWithDetails extends OrgMember {
  userName?: string;
  userEmail?: string;
}

interface InvitationWithDetails extends Invitation {
  invitedByName?: string;
}

export default function ShareModal({
  orgId,
  orgName,
  role,
  onClose,
}: ShareModalProps): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Check if user has admin permissions (admin or owner)
  const isAdmin = role === 'admin' || role === 'owner';

  // Members state
  const [members, setMembers] = useState<OrgMemberWithDetails[]>([]);
  const [owner, setOwner] = useState<OrgMemberWithDetails | null>(null);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [showAddMember, setShowAddMember] = useState<boolean>(false);

  // Invitations state
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState<boolean>(false);
  // Mark as used via console to avoid unused variable warning
  void loadingInvitations;

  const toast = useToast();

  // Load share settings
  useEffect(() => {
    async function loadSettings(): Promise<void> {
      try {
        setLoading(true);
        const settings = (await api.getShareSettings(orgId)) as ShareSettings & {
          shareUrl?: string;
          isPublic?: boolean;
        };
        // Handle both camelCase (from API) and snake_case (from type)
        setIsPublic(settings.isPublic ?? settings.is_public);
        setShareUrl(settings.shareUrl || settings.share_url || '');
      } catch (err) {
        console.error('Failed to load share settings:', err);
        toast.error('Failed to load share settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId, toast]);

  const loadMembers = useCallback(
    async (showLoading = true): Promise<void> => {
      try {
        if (showLoading) setLoadingMembers(true);
        // API returns { owner: {...}, members: [...] } not an array
        interface MembersResponse {
          owner: {
            userId: string;
            userName: string;
            userEmail: string;
            role: 'owner';
          };
          members: OrgMemberWithDetails[];
        }
        const response = (await api.getOrgMembers(orgId)) as unknown as MembersResponse;
        // Set owner with consistent shape
        if (response.owner) {
          setOwner({
            id: response.owner.userId,
            organization_id: orgId,
            user_id: response.owner.userId,
            userId: response.owner.userId,
            role: 'owner',
            joined_at: new Date().toISOString(), // Owner joined when org was created
            userName: response.owner.userName,
            userEmail: response.owner.userEmail,
          } as OrgMemberWithDetails);

          // Filter owner out of members list to avoid duplication
          // The backend returns all members including the owner
          setMembers((response.members || []).filter(member => member.role !== 'owner'));
        } else {
          setOwner(null);
          setMembers(response.members || []);
        }
      } catch (err) {
        console.error('Failed to load members:', err);
        if (showLoading) toast.error('Failed to load members');
      } finally {
        if (showLoading) setLoadingMembers(false);
      }
    },
    [orgId, toast]
  );

  const loadInvitations = useCallback(
    async (showLoading = true): Promise<void> => {
      try {
        if (showLoading) setLoadingInvitations(true);
        const data: InvitationWithDetails[] = await api.getInvitations(orgId);
        setInvitations(data || []);
      } catch (err) {
        console.error('Failed to load invitations:', err);
        // Don't show error toast - invitations are optional
      } finally {
        if (showLoading) setLoadingInvitations(false);
      }
    },
    [orgId]
  );

  // Load members on mount for admins
  useEffect(() => {
    if (isAdmin) {
      loadMembers();
      loadInvitations();
    }
  }, [isAdmin, loadMembers, loadInvitations]);

  // Real-time updates for members
  useRealtimeUpdates(orgId, {
    onMemberChange: () => {
      loadMembers(false);
      loadInvitations(false);
    },
    showNotifications: true,
  });

  // Toggle public/private
  const handleTogglePublic = async (): Promise<void> => {
    try {
      setSaving(true);
      const newIsPublic = !isPublic;
      const result = (await api.updateShareSettings(orgId, newIsPublic)) as ShareSettings & {
        shareUrl?: string;
        isPublic?: boolean;
      };
      // Handle both camelCase (from API) and snake_case (from type)
      setIsPublic(result.isPublic ?? result.is_public);
      setShareUrl(result.shareUrl || result.share_url || '');
      toast.success(newIsPublic ? 'Organization is now public' : 'Organization is now private');
    } catch (err) {
      console.error('Failed to update share settings:', err);
      toast.error('Failed to update share settings');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate share token
  const handleRegenerateToken = async (): Promise<void> => {
    if (!confirm('This will invalidate the current link. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      const result = (await api.regenerateShareToken(orgId)) as ShareSettings & {
        shareUrl?: string;
      };
      setShareUrl(result.shareUrl || result.share_url || '');
      toast.success('Share link regenerated successfully');
    } catch (err) {
      console.error('Failed to regenerate share token:', err);
      toast.error('Failed to regenerate share link');
    } finally {
      setSaving(false);
    }
  };

  // Copy share URL to clipboard
  const handleCopyUrl = async (): Promise<void> => {
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

  // Handle member added (from AddMemberModal)
  const handleMemberAdded = (member: OrgMemberWithDetails): void => {
    toast.success(`${member.userName} added as ${member.role}`);
    loadMembers();
  };

  // Handle invitation sent (from AddMemberModal)
  const handleInvitationSent = (invitation: Invitation): void => {
    toast.success(`Invitation sent to ${invitation.email}`);
    loadInvitations(); // Refresh invitations list
  };

  // Cancel invitation
  const handleCancelInvitation = async (invitationId: string, email: string): Promise<void> => {
    if (!confirm(`Cancel invitation for ${email}?`)) {
      return;
    }

    try {
      await api.cancelInvitation(orgId, invitationId);
      toast.success('Invitation cancelled');
      loadInvitations();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      toast.error('Failed to cancel invitation');
    }
  };

  // Resend invitation
  const handleResendInvitation = async (invitationId: string, email: string): Promise<void> => {
    try {
      await api.resendInvitation(orgId, invitationId);
      toast.success(`Invitation resent to ${email}`);
      loadInvitations();
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      toast.error('Failed to resend invitation');
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: string): Promise<void> => {
    try {
      await api.updateMemberRole(orgId, memberId, newRole as 'admin' | 'editor' | 'viewer');
      toast.success('Role updated successfully');
      loadMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
      toast.error('Failed to update role');
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberName: string): Promise<void> => {
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

  // Role badge colors
  const getRoleBadgeColor = (role: string): string => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      editor: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85dvh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Link2 className="text-blue-600" size={24} />
              <div>
                <h2
                  id="share-modal-title"
                  className="text-xl font-semibold text-slate-900 dark:text-white"
                >
                  Share Organization
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{orgName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Public Link Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                <Globe size={16} className="text-slate-500 dark:text-slate-400" />
                Public Link
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Public/Private Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isPublic ? (
                        <Globe className="text-green-600" size={20} />
                      ) : (
                        <Lock className="text-slate-500" size={20} />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {isPublic ? 'Public' : 'Private'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {isPublic
                            ? 'Anyone with the link can view'
                            : 'Only team members can view'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleTogglePublic}
                      disabled={saving || !isAdmin}
                      aria-label="Toggle public access"
                      title={!isAdmin ? 'Only admins can change sharing settings' : ''}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isPublic ? 'bg-blue-600' : 'bg-slate-300'
                      } ${saving || !isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Share Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono"
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
                      {isAdmin && (
                        <button
                          onClick={handleRegenerateToken}
                          disabled={saving}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={16} />
                          Regenerate link
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Team Members Section - admin only */}
            {isAdmin && (
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                    <Users size={16} className="text-slate-500 dark:text-slate-400" />
                    Team Members
                  </h3>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Users size={16} />
                    Add Member
                  </button>
                </div>

                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Owner */}
                    {owner && (
                      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                              {getInitials(owner.userName!)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {owner.userName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {owner.userEmail}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor('owner')}`}
                          >
                            Owner
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    {members.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Members
                        </h4>
                        {members.map((member: OrgMemberWithDetails) => (
                          <div
                            key={member.id}
                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                  {getInitials(member.userName!)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {member.userName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {member.userEmail}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <select
                                  value={member.role}
                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    handleUpdateRole(member.id, e.target.value)
                                  }
                                  className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="editor">Editor</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.userName!)}
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
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">
                          No team members yet. Add members to collaborate on this organization.
                        </p>
                      </div>
                    )}

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Pending and Expired Invitations
                        </h4>
                        {invitations.map((invitation: InvitationWithDetails) => (
                          <div
                            key={invitation.id}
                            className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-medium">
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {invitation.email}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Invited by {invitation.invitedByName} • {invitation.role}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Sent {new Date(invitation.created_at).toLocaleDateString()}
                                    {invitation.status === 'expired' && (
                                      <span className="text-red-500 ml-2 font-medium">
                                        (Expired)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    invitation.status === 'expired'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {invitation.status.charAt(0).toUpperCase() +
                                    invitation.status.slice(1)}
                                </span>
                                <button
                                  onClick={() =>
                                    handleResendInvitation(invitation.id, invitation.email)
                                  }
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="Resend invitation"
                                >
                                  <RefreshCw size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleCancelInvitation(invitation.id, invitation.email)
                                  }
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="Cancel invitation"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Permission Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Permission Levels:</strong>
                      </p>
                      <ul className="text-sm text-blue-800 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                        <li>
                          <strong>Viewer:</strong> Can view the organization
                        </li>
                        <li>
                          <strong>Editor:</strong> Can create, edit, and delete departments and
                          people
                        </li>
                        <li>
                          <strong>Admin:</strong> Can manage members and settings
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
        onMemberAdded={handleMemberAdded}
        onInvitationSent={handleInvitationSent}
        orgId={orgId}
      />
    </>
  );
}
