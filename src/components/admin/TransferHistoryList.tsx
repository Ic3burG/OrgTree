import React from 'react';
import { Clock, CheckCircle, XCircle, Slash, ArrowRight } from 'lucide-react';
import type { OwnershipTransfer } from '../../types/index.js';

interface TransferHistoryListProps {
  transfers: OwnershipTransfer[];
  loading: boolean;
}

export default function TransferHistoryList({
  transfers,
  loading,
}: TransferHistoryListProps): React.JSX.Element | null {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const completedTransfers = transfers.filter(t => t.status !== 'pending');

  if (completedTransfers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
        <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No transfer history available.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={18} className="text-red-500" />;
      case 'cancelled':
        return <Slash size={18} className="text-gray-400" />;
      case 'expired':
        return <Clock size={18} className="text-amber-500" />;
      default:
        return <Clock size={18} className="text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-3">
      {completedTransfers.map(transfer => (
        <div
          key={transfer.id}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-700/50`}
            >
              {getStatusIcon(transfer.status)}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                <span>{transfer.from_user_name}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span>{transfer.to_user_name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                <span>{new Date(transfer.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{getStatusText(transfer.status)}</span>
              </div>
            </div>
          </div>
          {transfer.completed_at && (
            <div className="text-xs text-gray-400 text-right">
              Completed on
              <br />
              {new Date(transfer.completed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
