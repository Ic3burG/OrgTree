import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, ShieldAlert, History, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../ui/Toast';
import TransferOwnershipModal from './TransferOwnershipModal';
import PendingTransferBanner from './PendingTransferBanner';
import TransferHistoryList from './TransferHistoryList';
import type { Organization, OwnershipTransfer } from '../../types/index.js';

export default function OrganizationSettings(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const toast = useToast();

  const [org, setOrg] = useState<Organization | null>(null);
  const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const [orgData, transfersData] = await Promise.all([
        api.getOrganization(orgId),
        api.getOwnershipTransfers(orgId),
      ]);
      setOrg(orgData);
      setTransfers(transfersData);
    } catch (err) {
      console.error('Failed to load organization settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!orgId) return <div />;

  if (loading && !org) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = org?.role === 'owner';
  const isAdmin = org?.role === 'admin' || isOwner;
  const activeTransfer = transfers.find(t => t.status === 'pending');

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-6 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
            <Settings size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Organization Settings
          </h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 ml-12">
          Manage settings and preferences for {org?.name}
        </p>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Pending Transfer Banner */}
        {activeTransfer && <PendingTransferBanner transfer={activeTransfer} onUpdate={loadData} />}

        {/* General Settings Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <Building2 size={20} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              General Information
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Organization Name
                </label>
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100">
                  {org?.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Your Role
                </label>
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 capitalize">
                  {org?.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer History Section */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
              <History size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Ownership Transfer History
              </h2>
            </div>
            <div className="p-6">
              <TransferHistoryList transfers={transfers} loading={loading} />
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {isOwner && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 overflow-hidden">
            <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
              <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
              <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Danger Zone</h2>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-1">
                    Transfer Ownership
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xl">
                    Transfer this organization to another member. You will be demoted to an Admin
                    and lose all Owner privileges. This action cannot be undone by you.
                  </p>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  disabled={!!activeTransfer}
                  className="px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl transition-colors border border-red-200 dark:border-red-900/30 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    activeTransfer
                      ? 'A transfer is already pending'
                      : 'Transfer organization ownership'
                  }
                >
                  Transfer Ownership
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        orgId={orgId}
        onSuccess={() => {
          loadData();
          toast.success('Ownership transfer initiated');
        }}
      />
    </div>
  );
}
