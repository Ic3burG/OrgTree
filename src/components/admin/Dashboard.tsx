import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Users, Download, Upload, Share2 } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';
import { generateCSV, downloadCSV } from '../../utils/csvExport';
import ImportModal from './ImportModal';
import ShareModal from './ShareModal';
import type { Organization, Department, CustomFieldDefinition } from '../../types/index.js';
import SecurityCheck from '../account/SecurityCheck';

interface OrganizationWithDetails extends Organization {
  departments?: Department[];
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
}

export default function Dashboard(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [organization, setOrganization] = useState<OrganizationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const toast = useToast();

  const loadOrganization = useCallback(async (): Promise<void> => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const [orgData, customFields] = await Promise.all([
        api.getOrganization(orgId),
        api.getCustomFieldDefinitions(orgId),
      ]);
      setOrganization(orgData);
      setFieldDefinitions(customFields);
    } catch {
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization, orgId]);

  const handleExport = (): void => {
    if (!organization || !organization.departments) return;
    try {
      const csv = generateCSV(
        { ...organization, departments: organization.departments },
        fieldDefinitions
      );
      const filename = `${organization.name.replace(/\s+/g, '-')}-org.csv`;
      downloadCSV(csv, filename);
      toast.success('Organization exported successfully');
    } catch {
      toast.error('Failed to export organization');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-slate-400">Organization not found</div>
      </div>
    );
  }

  const departmentCount = organization.departments?.length || 0;
  const peopleCount =
    organization.departments?.reduce((sum, dept) => sum + (dept.people?.length || 0), 0) || 0;

  const topLevelDepts =
    organization.departments?.filter((d: Department) => !d.parent_id).length || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - fixed */}
      <div className="flex-shrink-0 p-4 lg:p-8 pb-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <SecurityCheck />
          {/* Header */}
          <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row items-start gap-4 lg:justify-between">
            <div className="w-full lg:w-auto">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {organization.name}
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm lg:text-base">
                Organization overview and statistics
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-2 px-4 py-2.5 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation text-sm lg:text-base"
              >
                <Share2 size={20} />
                Share
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2.5 lg:py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 active:bg-gray-300 dark:active:bg-slate-500 transition-colors touch-manipulation text-sm lg:text-base"
              >
                <Upload size={20} />
                Import Data
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 lg:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation text-sm lg:text-base"
              >
                <Download size={20} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-4 lg:pb-8 min-h-0">
        <div className="max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">
                    Total Departments
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100">
                    {departmentCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {topLevelDepts} top-level departments
                {organization.created_at && (
                  <> • Created {new Date(organization.created_at).toLocaleDateString()}</>
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">Total People</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100">
                    {peopleCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {departmentCount > 0
                  ? `Average ${(peopleCount / departmentCount).toFixed(1)} per department`
                  : 'No departments yet'}
              </p>
            </div>
          </div>

          {/* Recent Departments */}
          {organization.departments && organization.departments.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Recent Departments
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {organization.departments
                    .sort((a: Department, b: Department) => {
                      // Handle missing dates safely
                      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map((dept: Department) => (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-slate-100">
                            {dept.name}
                          </h3>
                          {dept.description && (
                            <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {dept.people?.length || 0} people
                          </p>
                          {dept.created_at && (
                            <p className="text-xs text-gray-500">
                              {new Date(dept.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!organization.departments || organization.departments.length === 0) && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12 text-center">
              <Building2 size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No departments yet
              </h3>
              <p className="text-gray-500 dark:text-slate-400">
                Get started by creating your first department
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {orgId && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          orgId={orgId}
          onSuccess={() => {
            loadOrganization();
            toast.success('Data imported successfully');
          }}
        />
      )}

      {/* Share Modal */}
      {showShare && orgId && organization && (
        <ShareModal
          orgId={orgId}
          orgName={organization.name}
          role={organization.role}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
