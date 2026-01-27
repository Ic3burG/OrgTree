import React, { useState } from 'react';
import { AlertCircle, Check, Ban } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import type { OwnershipTransfer } from '../../types/index.js';

interface PendingTransferBannerProps {
  transfer: OwnershipTransfer;
  onUpdate: () => void;
}

export default function PendingTransferBanner({
  transfer,
  onUpdate,
}: PendingTransferBannerProps): React.JSX.Element | null {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!user || transfer.status !== 'pending') return null;

  const toUserId = transfer.toUserId || transfer.to_user_id;
  const fromUserId = transfer.fromUserId || transfer.from_user_id;
  const isRecipient = user.id === toUserId;
  const isInitiator = user.id === fromUserId;

  if (!isRecipient && !isInitiator) return null;

  const fromUserName = transfer.from_user_name || 'Unknown User';
  const toUserName = transfer.to_user_name || 'Unknown User';

  const handleAction = async (action: 'accept' | 'reject' | 'cancel') => {
    try {
      setLoading(true);
      if (action === 'accept') {
        await api.acceptOwnershipTransfer(transfer.id);
        toast.success('Ownership transfer accepted successfully');
        // Force a page reload to refresh permissions/roles
        window.location.reload();
      } else if (action === 'reject') {
        await api.rejectOwnershipTransfer(transfer.id);
        toast.info('Ownership transfer rejected');
        onUpdate();
      } else if (action === 'cancel') {
        await api.cancelOwnershipTransfer(transfer.id);
        toast.info('Ownership transfer cancelled');
        onUpdate();
      }
    } catch (err) {
      toast.error((err as Error).message || `Failed to ${action} transfer`);
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 overflow-hidden shadow-lg shadow-amber-500/10 animate-in slide-in-from-top-4 duration-500">
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {isRecipient ? 'Action Required: Ownership Transfer' : 'Ownership Transfer Pending'}
            </h3>
            <p className="text-gray-600 dark:text-slate-300 max-w-2xl">
              {isRecipient ? (
                <span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {fromUserName}
                  </span>{' '}
                  wants to transfer ownership of this organization to you. This will give you full
                  control and demote the current owner.
                </span>
              ) : (
                <span>
                  You have initiated a transfer to{' '}
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {toUserName}
                  </span>
                  . Waiting for their acceptance.
                </span>
              )}
            </p>
            {isRecipient && transfer.reason && (
              <div className="mt-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-sm text-gray-700 dark:text-slate-300 italic">
                "{transfer.reason}"
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:self-center self-end">
          {isRecipient ? (
            <>
              <button
                onClick={() => handleAction('reject')}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-black/20 rounded-xl transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('accept')}
                disabled={loading}
                className="px-6 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={16} />
                    <span>Accept Transfer</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction('cancel')}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center gap-2 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <>
                  <Ban size={16} />
                  <span>Cancel Request</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {/* Progress bar / Timeout indicator could go here */}
      <div className="h-1 bg-amber-100 dark:bg-amber-900/30">
        <div
          className="h-full bg-amber-500/50"
          style={{ width: '100%' }} // Could calculate % based on expires_at
        />
      </div>
    </div>
  );
}
