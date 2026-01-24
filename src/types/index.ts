// ============================================================================
// Shared Type Definitions
// Used by both frontend and backend (backend re-exports these)
// ============================================================================

// User and authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'superuser';
  created_at: string;
  updated_at?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  user: User;
  expiresIn: number;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  created_by_id: string;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  // Optional fields populated in some contexts
  memberCount?: number;
  departmentCount?: number;
  departments?: Department[];
  fieldDefinitions?: CustomFieldDefinition[];
  field_definitions?: CustomFieldDefinition[]; // Alias for some contexts
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  createdAt?: string; // Alias for created_at
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  // Optional populated user data
  user?: User;
}

export interface ShareSettings {
  is_public: boolean;
  share_token: string | null;
  share_url?: string;
}

// Custom Field types
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email'
  | 'phone';

export interface CustomFieldDefinition {
  id: string;
  organization_id: string;
  entity_type: 'person' | 'department';
  name: string;
  field_key: string;
  field_type: CustomFieldType;
  options: string[] | null;
  is_required: boolean;
  is_searchable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  field_definition_id: string;
  entity_id: string;
  value: string | null;
}

// Department types
export interface Department {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Optional fields populated in some contexts
  people?: Person[];
  children?: Department[];
  peopleCount?: number;
  custom_fields?: Record<string, string | null>;
}

// Person types
export interface Person {
  id: string;
  department_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_starred?: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Optional department info
  department_name?: string;
  custom_fields?: Record<string, string | null>;
}

// Invitation types
export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  token: string;
  expires_at: string;
  created_by_id: string;
  created_at: string;
  // Optional fields
  organization_name?: string;
  organizationName?: string; // Alias for convenience
  status?: 'pending' | 'accepted' | 'expired';
}

// Audit log types
export interface DatabaseAuditLog {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  actorName: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  entityData: string | null; // JSON string in SQLite
  createdAt: string;
}

export interface DatabaseCustomFieldDefinition {
  id: string;
  organization_id: string;
  entity_type: 'person' | 'department';
  name: string;
  field_key: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'url' | 'email' | 'phone';
  options: string | null; // JSON string in SQLite
  is_required: number; // SQLite boolean (0 or 1)
  is_searchable: number; // SQLite boolean (0 or 1)
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCustomFieldValue {
  id: string;
  field_definition_id: string;
  entity_type: 'person' | 'department';
  entity_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
  // Convenience aliases (some APIs return camelCase)
  actorName?: string;
  actionType?: string;
  entityType?: string;
  entityData?: Record<string, unknown> | null;
  createdAt?: string;
}

// Session types
export interface Session {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  last_used_at: string;
  created_at: string;
  is_current?: boolean;
}

// Security types
export interface Passkey {
  id: string;
  credentialId?: string;
  createdAt?: string; // Backwards compatible with legacy
  created_at: string;
  lastUsedAt?: string;
  last_used_at: string;
  backup_status?: boolean;
}

export interface TotpSetup {
  secret: string;
  qrCode: string; // Base64 image
  backupCodes: string[];
}

// Search types
export interface SearchResult {
  type: 'department' | 'person';
  id: string;
  name: string;
  highlight: string;
  custom_fields?: Record<string, string | null>;
  // Department-specific fields
  description?: string | null;
  parent_id?: string | null;
  people_count?: number;
  // Person-specific fields
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  department_id?: string;
  department_name?: string;
  is_starred?: boolean;
  rank?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  pagination: {
    hasMore: boolean;
    limit: number;
    offset: number;
  };
  suggestions?: string[];
  warnings?: string[];
  usedFallback?: boolean;
  performance?: {
    queryTimeMs: number;
    slowQuery?: boolean;
  };
}

export interface AutocompleteSuggestion {
  type: 'department' | 'person';
  id: string;
  text: string;
  parentId?: string | null;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

// Pagination types
export interface PaginatedResponse<T> {
  items?: T[];
  logs?: T[]; // For audit logs
  total?: number;
  hasMore: boolean;
  nextCursor: string | null;
}

// Bulk operation types
export interface BulkOperationResult {
  success: number;
  failed: Array<{ id: string; error: string }>; // Backend returns failed as array, not number
  errors: Array<{ id: string; error: string }>; // Deprecated, use failed instead
  // Additional fields returned by backend for specific operations
  deletedCount?: number;
  failedCount?: number;
  movedCount?: number;
  updatedCount?: number;
  warnings?: string[]; // For department deletions with cascading effects
}

// API Error
export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
}

// Socket.IO event types
export interface SocketDepartmentEvent {
  department: Department;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface SocketPersonEvent {
  person: Person;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface SocketMemberEvent {
  member: OrgMember;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

// Import/Export types
export interface CSVImportResult {
  departmentsCreated: number;
  departmentsReused?: number;
  peopleCreated: number;
  peopleSkipped: number;
  errors: string[];
}

// React Flow types (for org chart visualization)
export interface DepartmentNodeData {
  department: Department;
  peopleCount: number;
  expanded: boolean;
  isSearchResult?: boolean;
}

export interface PersonNodeData {
  person: Person;
  departmentName: string;
}

// Theme types
export type ThemeColor =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'red'
  | 'pink'
  | 'teal'
  | 'indigo';

export interface ThemeConfig {
  color: ThemeColor;
  primary: string;
  secondary: string;
  hover: string;
  text: string;
}
