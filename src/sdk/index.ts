/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

/**
 * OrgTree API SDK
 *
 * Auto-generated TypeScript SDK for the OrgTree API.
 * Types are generated from the OpenAPI specification.
 *
 * @example
 * ```typescript
 * import { OrgTreeClient } from './sdk';
 *
 * const client = new OrgTreeClient({
 *   baseUrl: 'http://localhost:3001/api',
 * });
 *
 * // Login
 * const { token, user } = await client.auth.login({
 *   email: 'user@example.com',
 *   password: 'password123',
 * });
 *
 * // Set token for authenticated requests
 * client.setToken(token);
 *
 * // Get organizations
 * const orgs = await client.organizations.list();
 * ```
 */

import type { paths, components } from './api-types';

// =============================================================================
// Type Exports
// =============================================================================

export type { paths, components };

// Extract schema types for convenience
export type User = components['schemas']['User'];
export type Organization = components['schemas']['Organization'];
export type Department = components['schemas']['Department'];
export type Person = components['schemas']['Person'];
export type Member = components['schemas']['Member'];
export type Invitation = components['schemas']['Invitation'];
export type AuditLog = components['schemas']['AuditLog'];
export type AuthResponse = components['schemas']['AuthResponse'];
export type SearchResult = components['schemas']['SearchResult'];

// =============================================================================
// SDK Configuration
// =============================================================================

export interface OrgTreeClientConfig {
  /** Base URL for the API (e.g., 'http://localhost:3001/api') */
  baseUrl: string;
  /** Optional initial token */
  token?: string;
  /** Optional fetch implementation (for Node.js or custom implementations) */
  fetch?: typeof fetch;
  /** Optional CSRF token for browser usage */
  csrfToken?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =============================================================================
// SDK Client
// =============================================================================

export class OrgTreeClient {
  private baseUrl: string;
  private token: string | null = null;
  private csrfToken: string | null = null;
  private fetchImpl: typeof fetch;

  constructor(config: OrgTreeClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token ?? null;
    this.csrfToken = config.csrfToken ?? null;
    this.fetchImpl = config.fetch ?? fetch;
  }

  /** Set the authentication token */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Set the CSRF token (for browser usage) */
  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  /** Get current token */
  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      auth?: boolean;
    } = {}
  ): Promise<T> {
    const { body, params, auth = true } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    // Make request
    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies for refresh token
    });

    // Parse response
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        typeof data === 'object' && data?.message ? data.message : 'Request failed',
        data
      );
    }

    return data as T;
  }

  // ===========================================================================
  // Health
  // ===========================================================================

  health = {
    /** Check server health */
    check: () =>
      this.request<{
        status: string;
        timestamp: string;
        database: string;
      }>('GET', '/health', { auth: false }),
  };

  // ===========================================================================
  // Authentication
  // ===========================================================================

  auth = {
    /** Register a new user */
    signup: (data: { name: string; email: string; password: string }) =>
      this.request<AuthResponse>('POST', '/auth/signup', { body: data, auth: false }),

    /** Login with email and password */
    login: (data: { email: string; password: string }) =>
      this.request<AuthResponse>('POST', '/auth/login', { body: data, auth: false }),

    /** Logout current session */
    logout: () => this.request<{ message: string }>('POST', '/auth/logout'),

    /** Logout all sessions */
    logoutAll: () => this.request<{ message: string }>('POST', '/auth/logout-all'),

    /** Refresh access token */
    refresh: () =>
      this.request<{ token: string; user: User }>('POST', '/auth/refresh', { auth: false }),

    /** Get current user profile */
    me: () => this.request<User>('GET', '/auth/me'),

    /** Change password */
    changePassword: (data: { oldPassword?: string; newPassword: string }) =>
      this.request<{ message: string }>('POST', '/auth/change-password', { body: data }),

    /** Get active sessions */
    sessions: () =>
      this.request<
        Array<{
          id: string;
          deviceInfo: string;
          ipAddress: string;
          lastUsedAt: string;
          createdAt: string;
          current: boolean;
        }>
      >('GET', '/auth/sessions'),

    /** Revoke a specific session */
    revokeSession: (sessionId: string) =>
      this.request<{ message: string }>('DELETE', `/auth/sessions/${sessionId}`),
  };

  // ===========================================================================
  // Organizations
  // ===========================================================================

  organizations = {
    /** List all organizations for current user */
    list: () => this.request<Organization[]>('GET', '/organizations'),

    /** Create a new organization */
    create: (data: { name: string; isPublic?: boolean }) =>
      this.request<Organization>('POST', '/organizations', { body: data }),

    /** Get organization by ID */
    get: (orgId: string) => this.request<Organization>('GET', `/organizations/${orgId}`),

    /** Update organization */
    update: (orgId: string, data: { name?: string; isPublic?: boolean }) =>
      this.request<Organization>('PUT', `/organizations/${orgId}`, { body: data }),

    /** Delete organization */
    delete: (orgId: string) =>
      this.request<{ message: string }>('DELETE', `/organizations/${orgId}`),

    /** Get full organization tree (departments + people) */
    getTree: (orgId: string) =>
      this.request<{
        organization: Organization;
        departments: Department[];
        people: Person[];
      }>('GET', `/organizations/${orgId}/tree`),
  };

  // ===========================================================================
  // Departments
  // ===========================================================================

  departments = {
    /** List departments in an organization */
    list: (orgId: string) =>
      this.request<Department[]>('GET', `/organizations/${orgId}/departments`),

    /** Create a department */
    create: (
      orgId: string,
      data: { name: string; description?: string; parentId?: string | null }
    ) => this.request<Department>('POST', `/organizations/${orgId}/departments`, { body: data }),

    /** Get department by ID */
    get: (orgId: string, deptId: string) =>
      this.request<Department>('GET', `/organizations/${orgId}/departments/${deptId}`),

    /** Update department */
    update: (
      orgId: string,
      deptId: string,
      data: { name?: string; description?: string; parentId?: string | null }
    ) =>
      this.request<Department>('PUT', `/organizations/${orgId}/departments/${deptId}`, {
        body: data,
      }),

    /** Delete department */
    delete: (orgId: string, deptId: string) =>
      this.request<{ message: string }>('DELETE', `/organizations/${orgId}/departments/${deptId}`),
  };

  // ===========================================================================
  // People
  // ===========================================================================

  people = {
    /** List people in an organization */
    list: (orgId: string, params?: { departmentId?: string }) =>
      this.request<Person[]>('GET', `/organizations/${orgId}/people`, { params }),

    /** Create a person */
    create: (
      orgId: string,
      data: {
        name: string;
        title?: string;
        email?: string;
        phone?: string;
        departmentId: string;
      }
    ) => this.request<Person>('POST', `/organizations/${orgId}/people`, { body: data }),

    /** Get person by ID */
    get: (orgId: string, personId: string) =>
      this.request<Person>('GET', `/organizations/${orgId}/people/${personId}`),

    /** Update person */
    update: (
      orgId: string,
      personId: string,
      data: {
        name?: string;
        title?: string;
        email?: string;
        phone?: string;
        departmentId?: string;
      }
    ) => this.request<Person>('PUT', `/organizations/${orgId}/people/${personId}`, { body: data }),

    /** Delete person */
    delete: (orgId: string, personId: string) =>
      this.request<{ message: string }>('DELETE', `/organizations/${orgId}/people/${personId}`),
  };

  // ===========================================================================
  // Members
  // ===========================================================================

  members = {
    /** List organization members */
    list: (orgId: string) => this.request<Member[]>('GET', `/organizations/${orgId}/members`),

    /** Update member role */
    updateRole: (orgId: string, userId: string, data: { role: 'admin' | 'editor' | 'viewer' }) =>
      this.request<Member>('PUT', `/organizations/${orgId}/members/${userId}`, { body: data }),

    /** Remove member from organization */
    remove: (orgId: string, userId: string) =>
      this.request<{ message: string }>('DELETE', `/organizations/${orgId}/members/${userId}`),
  };

  // ===========================================================================
  // Invitations
  // ===========================================================================

  invitations = {
    /** List pending invitations for an organization */
    list: (orgId: string) =>
      this.request<Invitation[]>('GET', `/organizations/${orgId}/invitations`),

    /** Create invitation */
    create: (orgId: string, data: { email: string; role: 'admin' | 'editor' | 'viewer' }) =>
      this.request<Invitation>('POST', `/organizations/${orgId}/invitations`, { body: data }),

    /** Cancel invitation */
    cancel: (orgId: string, invitationId: string) =>
      this.request<{ message: string }>(
        'DELETE',
        `/organizations/${orgId}/invitations/${invitationId}`
      ),

    /** Get invitation details by token (public) */
    getByToken: (token: string) =>
      this.request<{
        organizationName: string;
        role: string;
        status: string;
        expiresAt: string;
      }>('GET', `/invitations/${token}`, { auth: false }),

    /** Accept invitation */
    accept: (token: string) =>
      this.request<{ message: string; organizationId: string }>(
        'POST',
        `/invitations/${token}/accept`
      ),
  };

  // ===========================================================================
  // Search
  // ===========================================================================

  search = {
    /** Search within an organization */
    query: (
      orgId: string,
      params: {
        q: string;
        type?: 'all' | 'departments' | 'people';
        limit?: number;
        offset?: number;
      }
    ) =>
      this.request<{
        query: string;
        total: number;
        results: SearchResult[];
        pagination: { limit: number; offset: number; hasMore: boolean };
      }>('GET', `/organizations/${orgId}/search`, { params }),

    /** Get autocomplete suggestions */
    autocomplete: (orgId: string, params: { q: string; limit?: number }) =>
      this.request<{
        suggestions: Array<{ text: string; type: 'department' | 'person' }>;
      }>('GET', `/organizations/${orgId}/search/autocomplete`, { params }),
  };

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  bulk = {
    /** Bulk delete people */
    deletePeople: (orgId: string, personIds: string[]) =>
      this.request<{
        success: number;
        failed: number;
        results: Array<{ id: string; success: boolean; error?: string }>;
      }>('POST', `/organizations/${orgId}/people/bulk-delete`, { body: { personIds } }),

    /** Bulk move people to a department */
    movePeople: (orgId: string, personIds: string[], targetDepartmentId: string) =>
      this.request<{
        success: number;
        failed: number;
        results: Array<{ id: string; success: boolean; error?: string }>;
      }>('POST', `/organizations/${orgId}/people/bulk-move`, {
        body: { personIds, targetDepartmentId },
      }),

    /** Bulk edit people */
    editPeople: (
      orgId: string,
      personIds: string[],
      updates: { title?: string; departmentId?: string }
    ) =>
      this.request<{
        success: number;
        failed: number;
        results: Array<{ id: string; success: boolean; error?: string }>;
      }>('PUT', `/organizations/${orgId}/people/bulk-edit`, { body: { personIds, updates } }),

    /** Bulk delete departments */
    deleteDepartments: (orgId: string, departmentIds: string[]) =>
      this.request<{
        success: number;
        failed: number;
        results: Array<{ id: string; success: boolean; error?: string }>;
      }>('POST', `/organizations/${orgId}/departments/bulk-delete`, { body: { departmentIds } }),

    /** Bulk edit departments */
    editDepartments: (orgId: string, departmentIds: string[], updates: { parentId?: string }) =>
      this.request<{
        success: number;
        failed: number;
        results: Array<{ id: string; success: boolean; error?: string }>;
      }>('PUT', `/organizations/${orgId}/departments/bulk-edit`, {
        body: { departmentIds, updates },
      }),
  };

  // ===========================================================================
  // Audit
  // ===========================================================================

  audit = {
    /** Get audit logs for an organization */
    list: (
      orgId: string,
      params?: {
        actionType?: string;
        entityType?: string;
        limit?: number;
        offset?: number;
      }
    ) =>
      this.request<{
        logs: AuditLog[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      }>('GET', `/organizations/${orgId}/audit`, { params }),
  };

  // ===========================================================================
  // Import/Export
  // ===========================================================================

  importExport = {
    /** Export organization data as CSV */
    exportCsv: (orgId: string) =>
      this.request<Blob>('GET', `/organizations/${orgId}/export`, {
        params: { format: 'csv' },
      }),

    /** Import data from CSV */
    importCsv: (
      orgId: string,
      data: {
        departments: Array<{
          name: string;
          description?: string;
          parentId?: string;
        }>;
        people: Array<{
          name: string;
          title?: string;
          email?: string;
          phone?: string;
          departmentName: string;
        }>;
      }
    ) =>
      this.request<{
        departments: { created: number; errors: string[] };
        people: { created: number; errors: string[] };
      }>('POST', `/organizations/${orgId}/import`, { body: data }),
  };

  // ===========================================================================
  // Sharing
  // ===========================================================================

  sharing = {
    /** Get sharing settings */
    getSettings: (orgId: string) =>
      this.request<{
        isPublic: boolean;
        shareToken: string | null;
        shareUrl: string | null;
      }>('GET', `/organizations/${orgId}/sharing`),

    /** Generate new share token */
    generateToken: (orgId: string) =>
      this.request<{
        shareToken: string;
        shareUrl: string;
      }>('POST', `/organizations/${orgId}/sharing/token`),

    /** Revoke share token */
    revokeToken: (orgId: string) =>
      this.request<{ message: string }>('DELETE', `/organizations/${orgId}/sharing/token`),
  };

  // ===========================================================================
  // Public (unauthenticated)
  // ===========================================================================

  public = {
    /** Get public organization by share token */
    getOrganization: (shareToken: string) =>
      this.request<Organization>('GET', `/public/organizations/${shareToken}`, { auth: false }),

    /** Get public organization tree */
    getTree: (shareToken: string) =>
      this.request<{
        organization: Organization;
        departments: Department[];
        people: Person[];
      }>('GET', `/public/organizations/${shareToken}/tree`, { auth: false }),
  };

  // ===========================================================================
  // Users (Superuser only)
  // ===========================================================================

  users = {
    /** List all users (superuser only) */
    list: () => this.request<User[]>('GET', '/users'),

    /** Get user by ID (superuser only) */
    get: (userId: string) => this.request<User>('GET', `/users/${userId}`),

    /** Create user (superuser only) */
    create: (data: { name: string; email: string; role: 'user' | 'admin' | 'superuser' }) =>
      this.request<{ user: User; temporaryPassword: string }>('POST', '/users', { body: data }),

    /** Update user role (superuser only) */
    updateRole: (userId: string, data: { role: 'user' | 'admin' | 'superuser' }) =>
      this.request<User>('PUT', `/users/${userId}/role`, { body: data }),

    /** Reset user password (superuser only) */
    resetPassword: (userId: string) =>
      this.request<{ message: string; temporaryPassword: string }>(
        'POST',
        `/users/${userId}/reset-password`
      ),

    /** Delete user (superuser only) */
    delete: (userId: string) => this.request<{ message: string }>('DELETE', `/users/${userId}`),
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default OrgTreeClient;
