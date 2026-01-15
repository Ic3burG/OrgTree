import type {
  LoginResponse,
  RefreshTokenResponse,
  Organization,
  Department,
  Person,
  OrgMember,
  User,
  Invitation,
  ShareSettings,
  AuditLog,
  SearchResponse,
  BulkOperationResult,
  Session,
  CSVImportResult,
  PaginatedResponse,
  Passkey,
  TotpSetup,
  CustomFieldDefinition,
} from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// CSRF token storage
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null; // Prevent concurrent fetches

// Refresh token state
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Fetch CSRF token from the server
 * @returns {Promise<string>} The CSRF token
 */
async function fetchCsrfToken(): Promise<string> {
  // If already fetching, return the existing promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetch(`${API_BASE}/csrf-token`, {
    credentials: 'include', // Required for cookies
  })
    .then(response => response.json())
    .then((data: { csrfToken: string }) => {
      csrfToken = data.csrfToken;
      csrfTokenPromise = null; // Clear promise for future fetches
      return csrfToken;
    })
    .catch((err: unknown) => {
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
export async function initCsrf(): Promise<void> {
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
async function getCsrfToken(): Promise<string | null> {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
}

// ============================================
// REFRESH TOKEN FUNCTIONS
// ============================================

/**
 * Subscribe to token refresh completion
 * @param {function} callback - Called with new access token
 */
function subscribeToRefresh(callback: (token: string | null) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers of new token
 * @param {string} accessToken - New access token
 */
function onRefreshComplete(accessToken: string): void {
  refreshSubscribers.forEach(callback => callback(accessToken));
  refreshSubscribers = [];
}

/**
 * Notify subscribers of refresh failure
 */
function onRefreshFailed(): void {
  refreshSubscribers.forEach(callback => callback(null));
  refreshSubscribers = [];
}

/**
 * Handle authentication failure - clear state and redirect
 */
function handleAuthFailure(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  window.location.href = '/login';
}

/**
 * Attempt to refresh the access token
 * @returns {Promise<string|null>} New access token or null
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send httpOnly cookie
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as RefreshTokenResponse;

    // Store new access token
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Schedule next refresh before expiry
    scheduleTokenRefresh(data.expiresIn);

    return data.accessToken;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return null;
  }
}

/**
 * Schedule automatic token refresh before expiry
 * @param {number} expiresIn - Token lifetime in seconds
 */
export function scheduleTokenRefresh(expiresIn: number): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  // Refresh at 80% of token lifetime (12 minutes for 15-min token)
  const refreshTime = expiresIn * 0.8 * 1000;

  refreshTimer = setTimeout(async () => {
    const token = await refreshAccessToken();
    if (!token) {
      // Refresh failed, redirect to login
      handleAuthFailure();
    }
  }, refreshTime);
}

/**
 * Cancel scheduled token refresh (call on logout)
 */
export function cancelTokenRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  retryOnCsrf = true
): Promise<T> {
  const token = localStorage.getItem('token');

  // Get CSRF token for state-changing requests
  let csrf: string | null = null;
  const isStatefulRequest = ['POST', 'PUT', 'DELETE'].includes(options.method || 'GET');
  if (isStatefulRequest) {
    csrf = await getCsrfToken();
  }

  const config: RequestInit = {
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

  // Handle 401 - attempt refresh before redirecting
  if (response.status === 401) {
    // Don't try to refresh for auth endpoints (login, signup, refresh itself)
    if (endpoint.startsWith('/auth/')) {
      handleAuthFailure();
      throw new ApiError('Session expired', 401);
    }

    // If already refreshing, wait for it
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        subscribeToRefresh(async (newToken: string | null) => {
          if (newToken) {
            // Retry with new token
            const retryConfig: RequestInit = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            try {
              const retryResponse = await fetch(`${API_BASE}${endpoint}`, retryConfig);
              const retryData = (
                retryResponse.status !== 204 ? await retryResponse.json() : null
              ) as T | { message?: string; code?: string };
              if (!retryResponse.ok) {
                const errorData = retryData as { message?: string; code?: string };
                reject(
                  new ApiError(
                    errorData?.message || 'Request failed',
                    retryResponse.status,
                    errorData?.code
                  )
                );
              } else {
                resolve(retryData as T);
              }
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new ApiError('Session expired', 401));
          }
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshComplete(newToken);
        // Retry original request with new token
        const retryConfig: RequestInit = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        };
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, retryConfig);
        const retryData = (retryResponse.status !== 204 ? await retryResponse.json() : null) as
          | T
          | { message?: string; code?: string };

        if (!retryResponse.ok) {
          const errorData = retryData as { message?: string; code?: string };
          throw new ApiError(
            errorData?.message || 'Request failed',
            retryResponse.status,
            errorData?.code
          );
        }
        return retryData as T;
      } else {
        onRefreshFailed();
        handleAuthFailure();
        throw new ApiError('Session expired', 401);
      }
    } catch (err) {
      isRefreshing = false;
      onRefreshFailed();
      if (err instanceof ApiError) {
        throw err;
      }
      handleAuthFailure();
      throw new ApiError('Session expired', 401);
    }
  }

  const data = (response.status !== 204 ? await response.json() : null) as
    | T
    | { message?: string; code?: string };

  // Handle CSRF errors - refresh token and retry once
  if (
    response.status === 403 &&
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string' &&
    data.code.startsWith('CSRF_') &&
    retryOnCsrf
  ) {
    console.warn('CSRF token validation failed, refreshing token and retrying...');
    csrfToken = null; // Clear invalid token
    await fetchCsrfToken(); // Get new token
    return request<T>(endpoint, options, false); // Retry once without recursion
  }

  if (!response.ok) {
    const errorData = data as { message?: string; code?: string };
    throw new ApiError(errorData?.message || 'Request failed', response.status, errorData?.code);
  }

  return data as T;
}

const api = {
  // Auth
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Schedule refresh based on token expiry
    if (response.expiresIn) {
      scheduleTokenRefresh(response.expiresIn);
    }
    return response;
  },

  signup: async (name: string, email: string, password: string): Promise<LoginResponse> => {
    const response = await request<LoginResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    // Schedule refresh based on token expiry
    if (response.expiresIn) {
      scheduleTokenRefresh(response.expiresIn);
    }
    return response;
  },

  logout: (): Promise<void> =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),

  getMe: (): Promise<User> => request<User>('/auth/me'),

  updateProfile: (data: Partial<Pick<User, 'name' | 'email'>>): Promise<User> =>
    request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Session management
  getSessions: (): Promise<Session[]> => request<Session[]>('/auth/sessions'),

  revokeSession: (sessionId: string): Promise<void> =>
    request<void>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  revokeOtherSessions: (): Promise<{ revoked: number }> =>
    request<{ revoked: number }>('/auth/sessions/revoke-others', {
      method: 'POST',
    }),

  // 2FA
  get2FAStatus: (): Promise<{ enabled: boolean }> =>
    request<{ enabled: boolean }>('/auth/2fa/status'),

  setup2FA: (): Promise<TotpSetup> =>
    request<TotpSetup>('/auth/2fa/setup', {
      method: 'POST',
    }),

  verify2FA: (token: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  disable2FA: (): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/auth/2fa/disable', {
      method: 'POST',
    }),

  // Passkeys
  listPasskeys: (): Promise<Passkey[]> => request<Passkey[]>('/auth/passkey/list'),

  deletePasskey: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/auth/passkey/${id}`, {
      method: 'DELETE',
    }),

  // Organizations
  getOrganizations: (): Promise<Organization[]> => request<Organization[]>('/organizations'),

  getOrganization: (id: string): Promise<Organization> =>
    request<Organization>(`/organizations/${id}`),

  createOrganization: (name: string): Promise<Organization> =>
    request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  updateOrganization: (id: string, name: string): Promise<Organization> =>
    request<Organization>(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  deleteOrganization: (id: string): Promise<void> =>
    request<void>(`/organizations/${id}`, {
      method: 'DELETE',
    }),

  importOrganization: (orgId: string, data: unknown): Promise<CSVImportResult> =>
    request<CSVImportResult>(`/organizations/${orgId}/import`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),

  // Organization sharing
  getShareSettings: (orgId: string): Promise<ShareSettings> =>
    request<ShareSettings>(`/organizations/${orgId}/share`),

  updateShareSettings: (orgId: string, isPublic: boolean): Promise<ShareSettings> =>
    request<ShareSettings>(`/organizations/${orgId}/share`, {
      method: 'PUT',
      body: JSON.stringify({ isPublic }),
    }),

  regenerateShareToken: (orgId: string): Promise<ShareSettings> =>
    request<ShareSettings>(`/organizations/${orgId}/share/regenerate`, {
      method: 'POST',
    }),

  // Organization members
  getOrgMembers: (orgId: string): Promise<OrgMember[]> =>
    request<OrgMember[]>(`/organizations/${orgId}/members`),

  addOrgMember: (
    orgId: string,
    userId: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<OrgMember> =>
    request<OrgMember>(`/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  updateMemberRole: (
    orgId: string,
    memberId: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<OrgMember> =>
    request<OrgMember>(`/organizations/${orgId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: string, memberId: string): Promise<void> =>
    request<void>(`/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  addMemberByEmail: (
    orgId: string,
    email: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<OrgMember> =>
    request<OrgMember>(`/organizations/${orgId}/members/by-email`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  // Public (no auth)
  getPublicOrganization: async (shareToken: string): Promise<Organization> => {
    const response = await fetch(`${API_BASE}/public/org/${shareToken}`);
    const data = (await response.json()) as Organization | { message?: string };

    if (!response.ok) {
      const errorData = data as { message?: string };
      throw new ApiError(errorData?.message || 'Request failed', response.status);
    }

    return data as Organization;
  },

  // Departments
  getDepartments: (orgId: string): Promise<Department[]> =>
    request<Department[]>(`/organizations/${orgId}/departments`),

  createDepartment: (
    orgId: string,
    data: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>
  ): Promise<Department> =>
    request<Department>(`/organizations/${orgId}/departments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDepartment: (
    orgId: string,
    deptId: string,
    data: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>
  ): Promise<Department> =>
    request<Department>(`/organizations/${orgId}/departments/${deptId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDepartment: (orgId: string, deptId: string): Promise<void> =>
    request<void>(`/organizations/${orgId}/departments/${deptId}`, {
      method: 'DELETE',
    }),

  // People
  getPeople: (deptId: string): Promise<Person[]> =>
    request<Person[]>(`/departments/${deptId}/people`),

  createPerson: (
    deptId: string,
    data: Partial<Omit<Person, 'id' | 'created_at' | 'updated_at' | 'department_id'>>
  ): Promise<Person> =>
    request<Person>(`/departments/${deptId}/people`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePerson: (
    personId: string,
    data: Partial<Omit<Person, 'id' | 'created_at' | 'updated_at' | 'department_id'>>
  ): Promise<Person> =>
    request<Person>(`/people/${personId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePerson: (personId: string): Promise<void> =>
    request<void>(`/people/${personId}`, {
      method: 'DELETE',
    }),

  // User Management (superuser only)
  getUsers: (): Promise<User[]> => request<User[]>('/users'),

  getUser: (userId: string): Promise<User> => request<User>(`/users/${userId}`),

  getUserOrganizations: (userId: string): Promise<Organization[]> =>
    request<Organization[]>(`/users/${userId}/organizations`),

  updateUser: (userId: string, data: Partial<Pick<User, 'name' | 'email'>>): Promise<User> =>
    request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateUserRole: (userId: string, role: User['role']): Promise<User> =>
    request<User>(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  resetUserPassword: (userId: string): Promise<{ temporaryPassword: string }> =>
    request<{ temporaryPassword: string }>(`/users/${userId}/reset-password`, {
      method: 'POST',
    }),

  deleteUser: (userId: string): Promise<void> =>
    request<void>(`/users/${userId}`, {
      method: 'DELETE',
    }),

  createUser: (name: string, email: string, role: User['role']): Promise<User> =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role }),
    }),

  changePassword: (newPassword: string, oldPassword: string | null = null): Promise<void> =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, oldPassword }),
    }),

  // Invitations
  sendInvitation: (
    orgId: string,
    email: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<Invitation> =>
    request<Invitation>(`/organizations/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  getInvitations: (orgId: string): Promise<Invitation[]> =>
    request<Invitation[]>(`/organizations/${orgId}/invitations`),

  cancelInvitation: (orgId: string, invitationId: string): Promise<void> =>
    request<void>(`/organizations/${orgId}/invitations/${invitationId}`, {
      method: 'DELETE',
    }),

  getInvitationByToken: async (token: string): Promise<Invitation> => {
    const response = await fetch(`${API_BASE}/public/invitation/${token}`);
    const data = (await response.json()) as Invitation | { message?: string };
    if (!response.ok) {
      const errorData = data as { message?: string };
      throw new ApiError(errorData?.message || 'Request failed', response.status);
    }
    return data as Invitation;
  },

  acceptInvitation: (token: string): Promise<{ organization: Organization }> =>
    request<{ organization: Organization }>(`/invitations/${token}/accept`, {
      method: 'POST',
    }),

  // Audit logs
  getAuditLogs: (
    orgId: string,
    params: Record<string, string> = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const query = new URLSearchParams(params).toString();
    const url = `/organizations/${orgId}/audit-logs${query ? `?${query}` : ''}`;
    return request<PaginatedResponse<AuditLog>>(url);
  },

  getAdminAuditLogs: (
    params: Record<string, string> = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const query = new URLSearchParams(params).toString();
    const url = `/admin/audit-logs${query ? `?${query}` : ''}`;
    return request<PaginatedResponse<AuditLog>>(url);
  },

  // Search
  search: (orgId: string, params: Record<string, string> = {}): Promise<SearchResponse> => {
    const query = new URLSearchParams(params).toString();
    return request<SearchResponse>(`/organizations/${orgId}/search?${query}`);
  },

  searchAutocomplete: (orgId: string, q: string, limit = 5): Promise<SearchResponse> => {
    const params = new URLSearchParams({ q, limit: limit.toString() });
    return request<SearchResponse>(`/organizations/${orgId}/search/autocomplete?${params}`);
  },

  // Bulk Operations
  bulkDeletePeople: (orgId: string, personIds: string[]): Promise<BulkOperationResult> =>
    request<BulkOperationResult>(`/organizations/${orgId}/people/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ personIds }),
    }),

  bulkMovePeople: (
    orgId: string,
    personIds: string[],
    targetDepartmentId: string
  ): Promise<BulkOperationResult> =>
    request<BulkOperationResult>(`/organizations/${orgId}/people/bulk-move`, {
      method: 'POST',
      body: JSON.stringify({ personIds, targetDepartmentId }),
    }),

  bulkEditPeople: (
    orgId: string,
    personIds: string[],
    updates: Partial<Pick<Person, 'title' | 'email' | 'phone'>>
  ): Promise<BulkOperationResult> =>
    request<BulkOperationResult>(`/organizations/${orgId}/people/bulk-edit`, {
      method: 'PUT',
      body: JSON.stringify({ personIds, updates }),
    }),

  bulkDeleteDepartments: (orgId: string, departmentIds: string[]): Promise<BulkOperationResult> =>
    request<BulkOperationResult>(`/organizations/${orgId}/departments/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ departmentIds }),
    }),

  bulkEditDepartments: (
    orgId: string,
    departmentIds: string[],
    updates: { parentId?: string | null; description?: string }
  ): Promise<BulkOperationResult> =>
    request<BulkOperationResult>(`/organizations/${orgId}/departments/bulk-edit`, {
      method: 'PUT',
      body: JSON.stringify({ departmentIds, updates }),
    }),
  // Custom Fields
  getCustomFieldDefinitions: (orgId: string): Promise<CustomFieldDefinition[]> =>
    request<CustomFieldDefinition[]>(`/organizations/${orgId}/custom-fields`),

  createCustomFieldDefinition: (
    orgId: string,
    data: Partial<
      Omit<CustomFieldDefinition, 'id' | 'created_at' | 'updated_at' | 'organization_id'>
    >
  ): Promise<CustomFieldDefinition> =>
    request<CustomFieldDefinition>(`/organizations/${orgId}/custom-fields`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomFieldDefinition: (
    orgId: string,
    fieldId: string,
    data: Partial<
      Omit<CustomFieldDefinition, 'id' | 'created_at' | 'updated_at' | 'organization_id'>
    >
  ): Promise<CustomFieldDefinition> =>
    request<CustomFieldDefinition>(`/organizations/${orgId}/custom-fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCustomFieldDefinition: (orgId: string, fieldId: string): Promise<void> =>
    request<void>(`/organizations/${orgId}/custom-fields/${fieldId}`, {
      method: 'DELETE',
    }),

  reorderCustomFieldDefinitions: (
    orgId: string,
    fieldIds: string[]
  ): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/organizations/${orgId}/custom-fields/reorder`, {
      method: 'POST',
      body: JSON.stringify({ fieldIds }),
    }),
};

export default api;
export { api };
