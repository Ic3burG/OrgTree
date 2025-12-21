const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // Handle 401 - redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new ApiError('Session expired', 401);
  }

  const data = response.status !== 204 ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(data?.message || 'Request failed', response.status);
  }

  return data;
}

const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name, email, password) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => request('/auth/me'),

  // Organizations
  getOrganizations: () => request('/organizations'),

  getOrganization: (id) => request(`/organizations/${id}`),

  createOrganization: (name) =>
    request('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  updateOrganization: (id, name) =>
    request(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  deleteOrganization: (id) =>
    request(`/organizations/${id}`, {
      method: 'DELETE',
    }),

  importOrganization: (orgId, data) =>
    request(`/organizations/${orgId}/import`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  // Organization sharing
  getShareSettings: (orgId) => request(`/organizations/${orgId}/share`),

  updateShareSettings: (orgId, isPublic) =>
    request(`/organizations/${orgId}/share`, {
      method: 'PUT',
      body: JSON.stringify({ isPublic }),
    }),

  regenerateShareToken: (orgId) =>
    request(`/organizations/${orgId}/share/regenerate`, {
      method: 'POST',
    }),

  // Public (no auth)
  getPublicOrganization: async (shareToken) => {
    const response = await fetch(`${API_BASE}/public/org/${shareToken}`);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data?.message || 'Request failed', response.status);
    }

    return data;
  },

  // Departments
  getDepartments: (orgId) => request(`/organizations/${orgId}/departments`),

  createDepartment: (orgId, data) =>
    request(`/organizations/${orgId}/departments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDepartment: (orgId, deptId, data) =>
    request(`/organizations/${orgId}/departments/${deptId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDepartment: (orgId, deptId) =>
    request(`/organizations/${orgId}/departments/${deptId}`, {
      method: 'DELETE',
    }),

  // People
  getPeople: (deptId) => request(`/departments/${deptId}/people`),

  createPerson: (deptId, data) =>
    request(`/departments/${deptId}/people`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePerson: (personId, data) =>
    request(`/people/${personId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePerson: (personId) =>
    request(`/people/${personId}`, {
      method: 'DELETE',
    }),
};

export default api;
export { api };
