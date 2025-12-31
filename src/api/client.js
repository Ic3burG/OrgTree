const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// CSRF token storage
let csrfToken = null;
let csrfTokenPromise = null; // Prevent concurrent fetches

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Fetch CSRF token from the server
 * @returns {Promise<string>} The CSRF token
 */
async function fetchCsrfToken() {
  // If already fetching, return the existing promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetch(`${API_BASE}/csrf-token`, {
    credentials: 'include' // Required for cookies
  })
    .then(response => response.json())
    .then(data => {
      csrfToken = data.csrfToken;
      csrfTokenPromise = null; // Clear promise for future fetches
      return csrfToken;
    })
    .catch(err => {
      csrfTokenPromise = null; // Clear promise so retry is possible
      console.error('Failed to fetch CSRF token:', err);
      throw err;
    });

  return csrfTokenPromise;
}

/**
 * Initialize CSRF protection (fetch initial token)
 * Call this when the app starts
 */
export async function initCsrf() {
  try {
    await fetchCsrfToken();
  } catch (err) {
    console.error('Failed to initialize CSRF token:', err);
    // Don't throw - app can still work, just won't be able to make state-changing requests
  }
}

/**
 * Get the current CSRF token, fetching if necessary
 */
async function getCsrfToken() {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
}

async function request(endpoint, options = {}, retryOnCsrf = true) {
  const token = localStorage.getItem('token');

  // Get CSRF token for state-changing requests
  let csrf = null;
  const isStatefulRequest = ['POST', 'PUT', 'DELETE'].includes(options.method);
  if (isStatefulRequest) {
    csrf = await getCsrfToken();
  }

  const config = {
    ...options,
    credentials: 'include', // Required for CSRF cookies
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(csrf && { 'X-CSRF-Token': csrf }),
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

  // Handle CSRF errors - refresh token and retry once
  if (response.status === 403 && data?.code?.startsWith('CSRF_') && retryOnCsrf) {
    console.warn('CSRF token validation failed, refreshing token and retrying...');
    csrfToken = null; // Clear invalid token
    await fetchCsrfToken(); // Get new token
    return request(endpoint, options, false); // Retry once without recursion
  }

  if (!response.ok) {
    throw new ApiError(data?.message || 'Request failed', response.status, data?.code);
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

  getUserOrganizations: (userId) => request(`/users/${userId}/organizations`),

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

  changePassword: (newPassword, oldPassword = null) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, oldPassword }),
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

  // Search
  search: (orgId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/organizations/${orgId}/search?${query}`);
  },

  searchAutocomplete: (orgId, q, limit = 5) => {
    const params = new URLSearchParams({ q, limit: limit.toString() });
    return request(`/organizations/${orgId}/search/autocomplete?${params}`);
  },

  // Bulk Operations
  bulkDeletePeople: (orgId, personIds) =>
    request(`/organizations/${orgId}/people/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ personIds }),
    }),

  bulkMovePeople: (orgId, personIds, targetDepartmentId) =>
    request(`/organizations/${orgId}/people/bulk-move`, {
      method: 'POST',
      body: JSON.stringify({ personIds, targetDepartmentId }),
    }),

  bulkEditPeople: (orgId, personIds, updates) =>
    request(`/organizations/${orgId}/people/bulk-edit`, {
      method: 'PUT',
      body: JSON.stringify({ personIds, updates }),
    }),

  bulkDeleteDepartments: (orgId, departmentIds) =>
    request(`/organizations/${orgId}/departments/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ departmentIds }),
    }),

  bulkEditDepartments: (orgId, departmentIds, updates) =>
    request(`/organizations/${orgId}/departments/bulk-edit`, {
      method: 'PUT',
      body: JSON.stringify({ departmentIds, updates }),
    }),
};

export default api;
export { api };
