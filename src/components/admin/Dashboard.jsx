import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Users, FileText } from 'lucide-react';
import api from '../../api/client';

export default function Dashboard() {
  const { orgId } = useParams();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const peopleCount = organization.departments?.reduce(
    (sum, dept) => sum + (dept.people?.length || 0),
    0
  ) || 0;

  const topLevelDepts = organization.departments?.filter(
    (d) => !d.parent_id
  ).length || 0;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {organization.name}
          </h1>
          <p className="text-gray-500">
            Organization overview and statistics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Total Departments
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {departmentCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 size={24} className="text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {topLevelDepts} top-level departments
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Total People
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {peopleCount}
                </p>
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

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Organization ID
                </p>
                <p className="text-lg font-mono text-gray-700 truncate">
                  {organization.id}
                </p>
              </div>
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                <FileText size={24} className="text-violet-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Created {new Date(organization.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Recent Departments */}
        {organization.departments && organization.departments.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Departments
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {organization.departments
                  .sort(
                    (a, b) =>
                      new Date(b.created_at) - new Date(a.created_at)
                  )
                  .slice(0, 5)
                  .map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {dept.name}
                        </h3>
                        {dept.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {dept.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {dept.people?.length || 0} people
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(dept.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!organization.departments ||
          organization.departments.length === 0) && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No departments yet
            </h3>
            <p className="text-gray-500">
              Get started by creating your first department
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
