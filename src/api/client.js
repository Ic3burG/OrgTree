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

  // Organization members
  getOrgMembers: (orgId) => request(`/organizations/${orgId}/members`),

  addOrgMember: (orgId, userId, role) =>
    request(`/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  updateMemberRole: (orgId, memberId, role) =>
    request(`/organizations/${orgId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId, memberId) =>
    request(`/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  addMemberByEmail: (orgId, email, role) =>
    request(`/organizations/${orgId}/members/by-email`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
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

  // User Management (superuser only)
  getUsers: () => request('/users'),

  getUser: (userId) => request(`/users/${userId}`),

  updateUser: (userId, data) =>
    request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateUserRole: (userId, role) =>
    request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  resetUserPassword: (userId) =>
    request(`/users/${userId}/reset-password`, {
      method: 'POST',
    }),

  deleteUser: (userId) =>
    request(`/users/${userId}`, {
      method: 'DELETE',
    }),

  createUser: (name, email, role) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role }),
    }),

  changePassword: (newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // Invitations
  sendInvitation: (orgId, email, role) =>
    request(`/organizations/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  getInvitations: (orgId) => request(`/organizations/${orgId}/invitations`),

  cancelInvitation: (orgId, invitationId) =>
    request(`/organizations/${orgId}/invitations/${invitationId}`, {
      method: 'DELETE',
    }),

  getInvitationByToken: async (token) => {
    const response = await fetch(`${API_BASE}/public/invitation/${token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data?.message || 'Request failed', response.status);
    }
    return data;
  },

  acceptInvitation: (token) =>
    request(`/invitations/${token}/accept`, {
      method: 'POST',
    }),

  // Audit logs
  getAuditLogs: (orgId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `/organizations/${orgId}/audit-logs${query ? `?${query}` : ''}`;
    return request(url);
  },

  getAdminAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `/admin/audit-logs${query ? `?${query}` : ''}`;
    return request(url);
  },
};

export default api;
export { api };
