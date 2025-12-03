import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Mail, Phone, MapPin } from 'lucide-react';
import api from '../../api/client';
import PersonForm from './PersonForm';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function PersonManager() {
  const { orgId } = useParams();
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [orgId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load organization with all departments and people
      const orgData = await api.getOrganization(orgId);
      setDepartments(orgData.departments || []);

      // Flatten people from all departments
      const allPeople = [];
      (orgData.departments || []).forEach((dept) => {
        (dept.people || []).forEach((person) => {
          allPeople.push({
            ...person,
            departmentName: dept.name,
          });
        });
      });
      setPeople(allPeople);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingPerson) {
        await api.updatePerson(editingPerson.id, formData);
      } else {
        await api.createPerson(formData.department_id, formData);
      }
      setIsFormOpen(false);
      setEditingPerson(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to save person');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (person) => {
    setPersonToDelete(person);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.deletePerson(personToDelete.id);
      setDeleteModalOpen(false);
      setPersonToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete person');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPeople = people.filter((person) => {
    const matchesSearch =
      !searchTerm ||
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      !filterDepartment || person.department_id === filterDepartment;

    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading people...</div>
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

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">People</h1>
            <p className="text-gray-500">
              Manage people across all departments
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Person
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name, title, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* People List */}
        <div className="bg-white rounded-lg shadow">
          {filteredPeople.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="p-6 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {person.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {person.departmentName}
                        </span>
                      </div>

                      {person.title && (
                        <p className="text-sm text-gray-600 mb-3">
                          {person.title}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {person.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={16} />
                            <a
                              href={`mailto:${person.email}`}
                              className="hover:text-blue-600"
                            >
                              {person.email}
                            </a>
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} />
                            <span>{person.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(person)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit person"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(person)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete person"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterDepartment
                  ? 'No people found'
                  : 'No people yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterDepartment
                  ? 'Try adjusting your search or filters'
                  : 'Add your first person to get started'}
              </p>
              {!searchTerm && !filterDepartment && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Add Person
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {people.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredPeople.length} of {people.length} people
          </div>
        )}
      </div>

      {/* Person Form Modal */}
      <PersonForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPerson(null);
        }}
        onSubmit={handleFormSubmit}
        person={editingPerson}
        departments={departments}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPersonToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Person"
        message={`Are you sure you want to delete "${personToDelete?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
