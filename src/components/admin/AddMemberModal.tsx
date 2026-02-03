import React, { useState, FormEvent, ChangeEvent, useEffect, useRef } from 'react';
import api from '../../api/client';
import type { OrgMember, Invitation, User } from '../../types/index.js';
import { Search, User as UserIcon, Mail, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded?: (member: OrgMember) => void;
  onInvitationSent?: (invitation: Invitation) => void;
  orgId: string;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  onMemberAdded,
  onInvitationSent,
  orgId,
}: AddMemberModalProps): React.JSX.Element | null {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [error, setError] = useState('');
  const [userNotFound, setUserNotFound] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const toast = useToast();

  // Search/Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await api.searchUsers(searchQuery);
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const roles = [
    {
      value: 'viewer',
      label: 'Viewer',
      description: 'Can view the organization and all its content',
    },
    {
      value: 'editor',
      label: 'Editor',
      description: 'Can create, edit, and delete departments and people',
    },
    {
      value: 'admin',
      label: 'Admin',
      description: 'Can manage members and settings in addition to editor permissions',
    },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setUserNotFound(false);

    try {
      const roleValue = selectedRole as 'admin' | 'editor' | 'viewer';
      const member = await api.addMemberByEmail(orgId, email.trim(), roleValue);

      // Member added successfully
      if (onMemberAdded) {
        onMemberAdded(member);
      }
      handleClose();
    } catch (err) {
      if (err instanceof Error) {
        // Check if it's a user not found error
        if (err.message.includes('not found')) {
          setUserNotFound(true);
        } else {
          setError(err.message || 'Failed to add member');
        }
      } else {
        setError('Failed to add member');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvitation = async (): Promise<void> => {
    setIsSendingInvite(true);
    setError('');

    try {
      const roleValue = selectedRole as 'admin' | 'editor' | 'viewer';
      const invitation = await api.sendInvitation(orgId, email.trim(), roleValue);

      setInviteSent(true);

      // Check if email was sent successfully
      if ('emailSent' in invitation && !invitation.emailSent) {
        // Invitation created but email not sent - show as success with note
        toast.success(
          'Invitation created successfully! Note: Email notification could not be sent, but the user can still accept via the invite link.'
        );
      }

      if (onInvitationSent) {
        onInvitationSent(invitation);
      }
      // Auto close after a delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to send invitation');
      } else {
        setError('Failed to send invitation');
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setEmail(user.email);
    setSearchQuery(user.name);
    setShowDropdown(false);
    setUserNotFound(false);
    setError('');
  };

  const handleClose = () => {
    if (!isSubmitting && !isSendingInvite) {
      setEmail('');
      setSearchQuery('');
      setSelectedRole('viewer');
      setError('');
      setUserNotFound(false);
      setInviteSent(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Add Team Member
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting || isSendingInvite}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {inviteSent && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start">
                <div className="text-green-500 mt-0.5 mr-3 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-green-800 dark:text-green-300 font-medium">Invitation sent!</p>
                  <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                    An invitation email has been sent to {email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {userNotFound && !inviteSent && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start">
                <div className="text-amber-500 mt-0.5 mr-3 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-amber-800 dark:text-amber-300 font-medium">User not found</p>
                  <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                    No account exists with this email. Send them an invitation to join.
                  </p>
                  <button
                    type="button"
                    disabled={isSendingInvite}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleSendInvitation}
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Find User
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                    setEmail(e.target.value); // Allow typing email directly
                    if (!e.target.value.trim()) {
                      setEmail('');
                      setUserNotFound(false);
                    }
                  }}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  disabled={isSubmitting || isSendingInvite || inviteSent}
                  autoComplete="off"
                />
              </div>

              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 max-h-60 overflow-auto">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 text-left transition-colors border-b last:border-0 border-gray-100 dark:border-slate-700"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                        <UserIcon size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-slate-100">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {user.email}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {email && searchQuery && !showDropdown && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle size={16} />
                  <span>Selected: {email}</span>
                </div>
              )}
            </div>

            <div className="hidden">
              <input type="email" value={email} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Role
              </label>
              <div className="space-y-2">
                {roles.map(role => (
                  <label
                    key={role.value}
                    className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedRole === role.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSelectedRole(e.target.value)
                      }
                      className="mt-1 mr-3"
                      disabled={isSubmitting || isSendingInvite || inviteSent}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-slate-100">
                        {role.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {role.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting || isSendingInvite}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {inviteSent ? 'Close' : 'Cancel'}
            </button>
            {!inviteSent && (
              <button
                type="submit"
                disabled={isSubmitting || isSendingInvite || !email.trim() || userNotFound}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckCircle({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
