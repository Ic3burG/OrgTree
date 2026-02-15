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

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShieldAlert, Check, User } from 'lucide-react';
import { api } from '../../api/client.js';
import type { OrgMember } from '../../types/index.js';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onSuccess: () => void;
}

export default function TransferOwnershipModal({
  isOpen,
  onClose,
  orgId,
  onSuccess,
}: TransferOwnershipModalProps): React.JSX.Element | null {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const loadMembers = React.useCallback(async () => {
    try {
      setLoadingMembers(true);
      const data = await api.getOrgMembers(orgId);
      setMembers(data.members);
    } catch (err) {
      setError('Failed to load organization members');
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, [orgId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId('');
      setReason('');
      setError(null);
      setConfirmText('');
      loadMembers();
    }
  }, [isOpen, orgId, loadMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !reason) return;
    if (confirmText !== 'TRANSFER') {
      setError('Please type TRANSFER to confirm');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.initiateOwnershipTransfer(orgId, selectedMemberId, reason);
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to initiate transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isValid = selectedMemberId && reason.length >= 10 && confirmText === 'TRANSFER';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100 dark:border-red-900/30 flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                Transfer Ownership
              </h2>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Danger Zone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3 text-sm text-red-800 dark:text-red-200">
            <AlertTriangle className="flex-shrink-0 w-5 h-5" />
            <div className="space-y-2">
              <p className="font-semibold">Warning: This action is irreversible.</p>
              <p className="opacity-90">
                You will lose all Owner privileges and be demoted to an Admin. The new owner will
                have full control over the organization, including billing and member management.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Select New Owner
              </label>
              {loadingMembers ? (
                <div className="animate-pulse h-10 bg-gray-100 dark:bg-slate-700 rounded-lg" />
              ) : (
                <div className="relative">
                  <select
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 appearance-none transition-all"
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                    required
                  >
                    <option value="">Select a member...</option>
                    {members.map(member => (
                      <option key={member.id} value={member.user_id}>
                        {member.user?.name} ({member.user?.email}) - {member.role}
                      </option>
                    ))}
                  </select>
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Reason for Transfer
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 min-h-[100px] resize-none transition-all"
                placeholder="Please explain why you are transferring ownership..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                minLength={10}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 text-right">
                {reason.length}/10 characters minimum
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Type{' '}
                <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1 rounded">
                  TRANSFER
                </span>{' '}
                to confirm
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all placeholder:text-gray-400"
                placeholder="TRANSFER"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/20 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98] flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Transfer Ownership</span>
                <Check size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
