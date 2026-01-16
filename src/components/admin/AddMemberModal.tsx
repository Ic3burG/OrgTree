import React, { useState, FormEvent, ChangeEvent } from 'react';
import api from '../../api/client';
import type { OrgMember, Invitation } from '../../types/index.js';

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
      if (onInvitationSent) {
        onInvitationSent(invitation);
      }
      // Auto close after a delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        // Check if it's an email configuration error
        if (err.message.includes('email') || err.message.includes('configured')) {
          setError('Email service is not configured. Please contact the administrator.');
        } else {
          setError(err.message || 'Failed to send invitation');
        }
      } else {
        setError('Failed to send invitation');
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isSendingInvite) {
      setEmail('');
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Team Member</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting || isSendingInvite}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {inviteSent && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <p className="text-green-800 font-medium">Invitation sent!</p>
                  <p className="text-green-700 text-sm mt-1">
                    An invitation email has been sent to {email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {userNotFound && !inviteSent && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-amber-800 font-medium">User not found</p>
                  <p className="text-amber-700 text-sm mt-1">
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
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
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                  setError('');
                  setUserNotFound(false);
                  setInviteSent(false);
                }}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting || isSendingInvite || inviteSent}
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the email address of an existing user or someone to invite
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="space-y-2">
                {roles.map(role => (
                  <label
                    key={role.value}
                    className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedRole === role.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
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
                      <div className="font-medium text-gray-900">{role.label}</div>
                      <div className="text-sm text-gray-600">{role.description}</div>
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
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {inviteSent ? 'Close' : 'Cancel'}
            </button>
            {!inviteSent && (
              <button
                type="submit"
                disabled={isSubmitting || isSendingInvite || !email.trim() || userNotFound}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
