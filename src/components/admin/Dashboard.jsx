import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Users, FileText, Download, Upload, Share2 } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';
import { generateCSV, downloadCSV } from '../../utils/csvExport';
import ImportModal from './ImportModal';
import ShareModal from './ShareModal';

export default function Dashboard() {
  const { orgId } = useParams();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadOrganization();
  }, [orgId]);

  async function loadOrganization() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getOrganization(orgId);
      setOrganization(data);
    } catch (err) {
      setError(err.message || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  }

  const handleExport = () => {
    try {
      const csv = generateCSV(organization);
      const filename = `${organization.name.replace(/\s+/g, '-')}-org.csv`;
      downloadCSV(csv, filename);
      toast.success('Organization exported successfully');
    } catch (err) {
      toast.error('Failed to export organization');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
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
        <div className="text-gray-500">Organization not found</div>
      </div>
    );
  }

  const departmentCount = organization.departments?.length || 0;
  const peopleCount =
    organization.departments?.reduce((sum, dept) => sum + (dept.people?.length || 0), 0) || 0;

  const topLevelDepts = organization.departments?.filter(d => !d.parentId).length || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - fixed */}
      <div className="flex-shrink-0 p-4 lg:p-8 pb-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row items-start gap-4 lg:justify-between">
            <div className="w-full lg:w-auto">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {organization.name}
              </h1>
              <p className="text-gray-500 text-sm lg:text-base">
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
                className="flex items-center gap-2 px-4 py-2.5 lg:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation text-sm lg:text-base"
              >
                <Upload size={20} />
                Import CSV
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
            <div className="bg-white rounded-lg shadow p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">
                    Total Departments
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900">{departmentCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {topLevelDepts} top-level departments
                {organization.createdAt && (
                  <> • Created {new Date(organization.createdAt).toLocaleDateString()}</>
                )}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">Total People</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900">{peopleCount}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
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
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Departments</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {organization.departments
                    .sort((a, b) => {
                      // Handle missing dates safely
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map(dept => (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{dept.name}</h3>
                          {dept.description && (
                            <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {dept.people?.length || 0} people
                          </p>
                          {dept.createdAt && (
                            <p className="text-xs text-gray-500">
                              {new Date(dept.createdAt).toLocaleDateString()}
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
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
              <p className="text-gray-500">Get started by creating your first department</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        orgId={orgId}
        onSuccess={() => {
          loadOrganization();
          toast.success('Data imported successfully');
        }}
      />

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          orgId={orgId}
          orgName={organization.name}
          userRole={organization.userRole}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
