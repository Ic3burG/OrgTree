import db from '../db.js';
import { checkOrgAccess } from './member.service.js';
import { escapeHtml } from '../utils/escape.js';

// ============================================================================
// Types
// ============================================================================

interface SearchResult {
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

export interface SearchOptions {
  query: string;
  type?: 'all' | 'departments' | 'people';
  limit?: number;
  offset?: number;
  starredOnly?: boolean;
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

interface DepartmentSuggestionRow {
  id: string;
  name: string;
  parent_id: string | null;
}

interface PersonSuggestionRow {
  id: string;
  name: string;
  title: string | null;
  department_id: string;
}

/**
 * Validate FTS query for common issues that cause syntax errors
 */
function validateFtsQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: true };
  }

  const trimmed = query.trim();

  // Check for unbalanced quotes
  const singleQuotes = (trimmed.match(/'/g) || []).length;
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unbalanced single quotes in search query' };
  }
  if (doubleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unbalanced double quotes in search query' };
  }

  // Check for excessive wildcards (more than 50% of characters)
  const wildcardCount = (trimmed.match(/\*/g) || []).length;
  if (wildcardCount > trimmed.length * 0.5) {
    return { valid: false, error: 'Too many wildcards in search query' };
  }

  // Check for invalid FTS5 operators (NOT, AND, OR must be uppercase in FTS5)
  const hasInvalidOperator = /\b(not|and|or)\b/.test(trimmed);
  if (hasInvalidOperator) {
    return {
      valid: false,
      error: 'FTS5 operators must be uppercase (use AND, OR, NOT instead of and, or, not)',
    };
  }

  // Check for certain special characters that can cause issues
  // eslint-disable-next-line no-control-regex
  const dangerousChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
  if (dangerousChars.test(trimmed)) {
    return { valid: false, error: 'Search query contains invalid control characters' };
  }

  return { valid: true };
}

/**
 * Build FTS query from simple search string
 */
function buildFtsQuery(query: string): string {
  if (!query) return '';
  // Split into tokens, escape, and add asterisk for prefix matching
  return query
    .trim()
    .split(/\s+/)
    .map(token => {
      // Escape single and double quotes by doubling them, then wrap in double quotes
      const escapedToken = token.replace(/'/g, "''").replace(/"/g, '""');
      return `"${escapedToken}"*`;
    })
    .join(' ');
}

/**
 * Helper to fetch custom fields for a list of entities
 */
function attachCustomFields(orgId: string, results: SearchResult[]): SearchResult[] {
  if (results.length === 0) return results;

  const entityIds = results.map(r => r.id);
  const placeholders = entityIds.map(() => '?').join(',');

  // Note: custom_field_values uses field_definition_id (not field_id)
  // and doesn't have organization_id or deleted_at columns.
  // We filter by org through the custom_field_definitions table.
  const stmt = db.prepare(`
    SELECT
      cv.entity_id,
      cv.entity_type,
      cd.field_key,
      cv.value
    FROM custom_field_values cv
    JOIN custom_field_definitions cd ON cv.field_definition_id = cd.id
    WHERE cd.organization_id = ?
      AND cv.entity_id IN (${placeholders})
  `);

  const rows = stmt.all(orgId, ...entityIds) as {
    entity_id: string;
    entity_type: string;
    field_key: string;
    value: string;
  }[];

  const fieldMap = new Map<string, Record<string, string>>();
  rows.forEach(row => {
    if (!fieldMap.has(row.entity_id)) {
      fieldMap.set(row.entity_id, {});
    }
    fieldMap.get(row.entity_id)![row.field_key] = row.value;
  });

  return results.map(r => ({
    ...r,
    custom_fields: fieldMap.get(r.id) || {},
  }));
}

/**
 * Search departments using FTS5
 *
 * Note: SQLite FTS5's bm25() function cannot be used inside subqueries or UNION statements.
 * We run separate queries and merge results in JavaScript to work around this limitation.
 */
function searchDepartments(
  orgId: string,
  ftsQuery: string,
  limit: number,
  offset: number
): { total: number; results: SearchResult[] } {
  // Query 1: Search in department name/description
  const nameSql = `
    SELECT
      d.id,
      d.name,
      d.description,
      d.parent_id,
      snippet(df.departments_fts, 0, '<mark>', '</mark>', '...', 32) as nameHighlight,
      snippet(df.departments_fts, 1, '<mark>', '</mark>', '...', 32) as descHighlight,
      (SELECT COUNT(*) FROM people WHERE department_id = d.id AND deleted_at IS NULL) as people_count,
      bm25(df.departments_fts) as rank
    FROM departments_fts df
    JOIN departments d ON d.rowid = df.rowid
    WHERE df.departments_fts MATCH ?
      AND d.organization_id = ?
      AND d.deleted_at IS NULL
  `;

  // Query 2: Search in custom fields
  const customSql = `
    SELECT
      d.id,
      d.name,
      d.description,
      d.parent_id,
      snippet(cf.custom_fields_fts, 2, '<mark>', '</mark>', '...', 32) as customHighlight,
      (SELECT COUNT(*) FROM people WHERE department_id = d.id AND deleted_at IS NULL) as people_count,
      bm25(cf.custom_fields_fts) as rank
    FROM custom_fields_fts cf
    JOIN departments d ON d.id = cf.entity_id
    WHERE cf.custom_fields_fts MATCH ?
      AND cf.entity_type = 'department'
      AND d.organization_id = ?
      AND d.deleted_at IS NULL
  `;

  // Execute both queries
  const nameRows = db.prepare(nameSql).all(ftsQuery, orgId) as Array<{
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    nameHighlight: string | null;
    descHighlight: string | null;
    people_count: number;
    rank: number;
  }>;

  const customRows = db.prepare(customSql).all(ftsQuery, orgId) as Array<{
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    customHighlight: string | null;
    people_count: number;
    rank: number;
  }>;

  // Merge results, keeping best rank for duplicates
  const resultMap = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      parent_id: string | null;
      nameHighlight: string | null;
      descHighlight: string | null;
      customHighlight: string | null;
      people_count: number;
      rank: number;
    }
  >();

  // Add name/description matches
  for (const row of nameRows) {
    resultMap.set(row.id, {
      ...row,
      customHighlight: null,
    });
  }

  // Add custom field matches (merge with existing if present)
  for (const row of customRows) {
    const existing = resultMap.get(row.id);
    if (existing) {
      // Keep existing data but add custom highlight and use best rank
      existing.customHighlight = row.customHighlight;
      existing.rank = Math.min(existing.rank, row.rank);
    } else {
      resultMap.set(row.id, {
        ...row,
        nameHighlight: null,
        descHighlight: null,
      });
    }
  }

  // Convert to array, sort by rank, and apply pagination
  const allResults = Array.from(resultMap.values());
  allResults.sort((a, b) => a.rank - b.rank);

  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);

  const results = paginatedResults.map(
    (row): SearchResult => ({
      type: 'department',
      id: row.id,
      name: row.name,
      description: row.description,
      parent_id: row.parent_id,
      highlight: escapeHtml(
        row.nameHighlight || row.descHighlight || row.customHighlight || row.name
      )
        .replace(/&lt;mark&gt;/g, '<mark>')
        .replace(/&lt;&#x2F;mark&gt;/g, '</mark>')
        .replace(/&lt;\/mark&gt;/g, '</mark>'),
      people_count: row.people_count,
      rank: row.rank,
    })
  );

  return {
    total,
    results: attachCustomFields(orgId, results),
  };
}

/**
 * Search people using FTS5
 *
 * Note: SQLite FTS5's bm25() function cannot be used inside subqueries or UNION statements.
 * We run separate queries and merge results in JavaScript to work around this limitation.
 */
function searchPeople(
  orgId: string,
  ftsQuery: string,
  limit: number,
  offset: number,
  starredOnly: boolean = false
): { total: number; results: SearchResult[] } {
  // Build the starred filter clause
  const starredClause = starredOnly ? 'AND p.is_starred = 1' : '';

  // Query 1: Search in people name/title/email/phone
  const peopleSql = `
    SELECT
      p.id,
      p.name,
      p.title,
      p.email,
      p.phone,
      p.department_id,
      p.is_starred,
      d.name as department_name,
      snippet(pf.people_fts, 0, '<mark>', '</mark>', '...', 32) as nameHighlight,
      snippet(pf.people_fts, 1, '<mark>', '</mark>', '...', 32) as titleHighlight,
      snippet(pf.people_fts, 2, '<mark>', '</mark>', '...', 32) as emailHighlight,
      bm25(pf.people_fts) as rank
    FROM people_fts pf
    JOIN people p ON p.rowid = pf.rowid
    JOIN departments d ON p.department_id = d.id
    WHERE pf.people_fts MATCH ?
      AND d.organization_id = ?
      AND p.deleted_at IS NULL
      AND d.deleted_at IS NULL
      ${starredClause}
  `;

  // Query 2: Search in custom fields
  const customSql = `
    SELECT
      p.id,
      p.name,
      p.title,
      p.email,
      p.phone,
      p.department_id,
      p.is_starred,
      d.name as department_name,
      snippet(cf.custom_fields_fts, 2, '<mark>', '</mark>', '...', 32) as customHighlight,
      bm25(cf.custom_fields_fts) as rank
    FROM custom_fields_fts cf
    JOIN people p ON p.id = cf.entity_id
    JOIN departments d ON p.department_id = d.id
    WHERE cf.custom_fields_fts MATCH ?
      AND cf.entity_type = 'person'
      AND d.organization_id = ?
      AND p.deleted_at IS NULL
      AND d.deleted_at IS NULL
      ${starredClause}
  `;

  // Execute both queries
  const peopleRows = db.prepare(peopleSql).all(ftsQuery, orgId) as Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    department_id: string;
    is_starred: number;
    department_name: string;
    nameHighlight: string | null;
    titleHighlight: string | null;
    emailHighlight: string | null;
    rank: number;
  }>;

  const customRows = db.prepare(customSql).all(ftsQuery, orgId) as Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    department_id: string;
    is_starred: number;
    department_name: string;
    customHighlight: string | null;
    rank: number;
  }>;

  // Merge results, keeping best rank for duplicates
  const resultMap = new Map<
    string,
    {
      id: string;
      name: string;
      title: string | null;
      email: string | null;
      phone: string | null;
      department_id: string;
      is_starred: number;
      department_name: string;
      nameHighlight: string | null;
      titleHighlight: string | null;
      emailHighlight: string | null;
      customHighlight: string | null;
      rank: number;
    }
  >();

  // Add people field matches
  for (const row of peopleRows) {
    resultMap.set(row.id, {
      ...row,
      customHighlight: null,
    });
  }

  // Add custom field matches (merge with existing if present)
  for (const row of customRows) {
    const existing = resultMap.get(row.id);
    if (existing) {
      // Keep existing data but add custom highlight and use best rank
      existing.customHighlight = row.customHighlight;
      existing.rank = Math.min(existing.rank, row.rank);
    } else {
      resultMap.set(row.id, {
        ...row,
        nameHighlight: null,
        titleHighlight: null,
        emailHighlight: null,
      });
    }
  }

  // Convert to array, sort by rank, and apply pagination
  const allResults = Array.from(resultMap.values());
  allResults.sort((a, b) => a.rank - b.rank);

  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);

  const results = paginatedResults.map(
    (row): SearchResult => ({
      type: 'person',
      id: row.id,
      name: row.name,
      title: row.title,
      email: row.email,
      phone: row.phone,
      department_id: row.department_id,
      department_name: row.department_name,
      is_starred: Boolean(row.is_starred),
      highlight: escapeHtml(
        row.nameHighlight ||
          row.titleHighlight ||
          row.emailHighlight ||
          row.customHighlight ||
          row.name
      )
        .replace(/&lt;mark&gt;/g, '<mark>')
        .replace(/&lt;&#x2F;mark&gt;/g, '</mark>')
        .replace(/&lt;\/mark&gt;/g, '</mark>'),
      rank: row.rank,
    })
  );

  return {
    total,
    results: attachCustomFields(orgId, results),
  };
}

/**
 * Fallback search for departments using LIKE queries (when FTS fails)
 */
function fallbackSearchDepartments(
  orgId: string,
  query: string,
  limit: number,
  offset: number
): { total: number; results: SearchResult[] } {
  const likePattern = `%${query.trim().replace(/[%_]/g, '\\$&')}%`;

  const sql = `
    SELECT
      d.id,
      d.name,
      d.description,
      d.parent_id,
      (SELECT COUNT(*) FROM people WHERE department_id = d.id AND deleted_at IS NULL) as people_count
    FROM departments d
    WHERE d.organization_id = ?
      AND d.deleted_at IS NULL
      AND (
        d.name LIKE ? ESCAPE '\\'
        OR d.description LIKE ? ESCAPE '\\'
      )
    ORDER BY d.name
  `;

  const rows = db.prepare(sql).all(orgId, likePattern, likePattern) as Array<{
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    people_count: number;
  }>;

  const total = rows.length;
  const paginatedRows = rows.slice(offset, offset + limit);

  const results = paginatedRows.map(
    (row): SearchResult => ({
      type: 'department',
      id: row.id,
      name: row.name,
      description: row.description,
      parent_id: row.parent_id,
      highlight: row.name,
      people_count: row.people_count,
    })
  );

  return {
    total,
    results: attachCustomFields(orgId, results),
  };
}

/**
 * Fallback search for people using LIKE queries (when FTS fails)
 */
function fallbackSearchPeople(
  orgId: string,
  query: string,
  limit: number,
  offset: number,
  starredOnly: boolean = false
): { total: number; results: SearchResult[] } {
  const likePattern = `%${query.trim().replace(/[%_]/g, '\\$&')}%`;
  const starredClause = starredOnly ? 'AND p.is_starred = 1' : '';

  const sql = `
    SELECT
      p.id,
      p.name,
      p.title,
      p.email,
      p.phone,
      p.department_id,
      p.is_starred,
      d.name as department_name
    FROM people p
    JOIN departments d ON p.department_id = d.id
    WHERE d.organization_id = ?
      AND p.deleted_at IS NULL
      AND d.deleted_at IS NULL
      ${starredClause}
      AND (
        p.name LIKE ? ESCAPE '\\'
        OR p.title LIKE ? ESCAPE '\\'
        OR p.email LIKE ? ESCAPE '\\'
        OR p.phone LIKE ? ESCAPE '\\'
      )
    ORDER BY p.name
  `;

  const rows = db
    .prepare(sql)
    .all(orgId, likePattern, likePattern, likePattern, likePattern) as Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    department_id: string;
    is_starred: number;
    department_name: string;
  }>;

  const total = rows.length;
  const paginatedRows = rows.slice(offset, offset + limit);

  const results = paginatedRows.map(
    (row): SearchResult => ({
      type: 'person',
      id: row.id,
      name: row.name,
      title: row.title,
      email: row.email,
      phone: row.phone,
      department_id: row.department_id,
      department_name: row.department_name,
      is_starred: Boolean(row.is_starred),
      highlight: row.name,
    })
  );

  return {
    total,
    results: attachCustomFields(orgId, results),
  };
}

/**
 * Main search function - searches both departments and people
 */
export async function search(
  orgId: string,
  userId: string | undefined,
  options: SearchOptions
): Promise<SearchResponse> {
  // Start performance tracking
  const startTime = Date.now();

  // Check if organization exists and get its public status
  const org = db.prepare('SELECT is_public FROM organizations WHERE id = ?').get(orgId) as
    | { is_public: number }
    | undefined;

  if (!org) {
    const error = new Error('Organization not found') as { status?: number };
    error.status = 404;
    throw error;
  }

  const isPublic = org.is_public === 1;

  // Debug logging
  console.log('[search] Permission check:', {
    orgId,
    userId: userId ? 'present' : 'none',
    isPublic,
    willCheckPermission: userId && !isPublic,
  });

  // Check access permissions
  if (userId) {
    // Authenticated user: check membership for private orgs
    // For public orgs, allow access without membership check (avoids misleading audit logs)
    if (!isPublic) {
      // Private org - requires membership
      // Use checkOrgAccess directly to ensure we are checking for 'viewer'
      const access = checkOrgAccess(orgId, userId);

      if (!access.hasAccess) {
        console.warn(`[search] Access Denied: User ${userId} has no access to org ${orgId}`);
        const error = new Error('Organization not found') as { status?: number };
        error.status = 404;
        throw error;
      }

      // Explicitly check for viewer role (level 0)
      // roleHierarchy: viewer=0, editor=1, admin=2, owner=3
      // We accept any valid role (all are >= viewer)
      if (!access.role) {
        console.warn(`[search] Permission Denied: User ${userId} has no role in org ${orgId}`);
        const error = new Error('Insufficient permissions') as { status?: number };
        error.status = 403;
        throw error;
      }
    } else {
      console.log('[search] Skipping permission check for public org');
    }
    // Note: For public orgs, we still allow the user to search even if not a member
  } else {
    // Guest user: only allow access to public organizations
    if (!isPublic) {
      console.log('[search] Blocking guest user from private org');
      const error = new Error('Insufficient permissions') as { status?: number };
      error.status = 403;
      throw error;
    } else {
      console.log('[search] Allowing guest user to search public org');
    }
  }

  const { query, type = 'all', limit = 20, offset = 0, starredOnly = false } = options;

  // Validate query before processing
  const validation = validateFtsQuery(query);
  if (!validation.valid) {
    console.warn('Invalid FTS query:', validation.error);
    // Return empty results with warning instead of throwing error
    return {
      query,
      total: 0,
      results: [],
      pagination: { limit, offset, hasMore: false },
      warnings: [validation.error || 'Invalid search query'],
    };
  }

  // Build FTS query with prefix matching
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) {
    return {
      query,
      total: 0,
      results: [],
      pagination: { limit, offset, hasMore: false },
    };
  }

  const results: SearchResult[] = [];
  let totalDepts = 0;
  let totalPeople = 0;
  const warnings: string[] = [];
  let usedFallback = false;

  // Search departments if requested
  if (type === 'all' || type === 'departments') {
    try {
      const deptResults = searchDepartments(orgId, ftsQuery, limit, offset);
      results.push(...deptResults.results);
      totalDepts = deptResults.total;
    } catch (err: unknown) {
      console.error('Department FTS search error, trying fallback:', err);
      // Try fallback search
      try {
        const fallbackResults = fallbackSearchDepartments(orgId, query, limit, offset);
        results.push(...fallbackResults.results);
        totalDepts = fallbackResults.total;
        usedFallback = true;
        warnings.push('Department search using basic matching (full-text search unavailable)');
      } catch (fallbackErr: unknown) {
        console.error('Department fallback search also failed:', fallbackErr);
        warnings.push('Department search failed - some results may be missing');
      }
    }
  }

  // Search people if requested
  if (type === 'all' || type === 'people') {
    try {
      // Adjust limit for people if we already have department results
      const peopleLimit = type === 'all' ? Math.max(1, limit - results.length) : limit;
      const peopleResults = searchPeople(orgId, ftsQuery, peopleLimit, offset, starredOnly);
      results.push(...peopleResults.results);
      totalPeople = peopleResults.total;
    } catch (err: unknown) {
      console.error('People FTS search error, trying fallback:', err);
      // Try fallback search
      try {
        const peopleLimit = type === 'all' ? Math.max(1, limit - results.length) : limit;
        const fallbackResults = fallbackSearchPeople(
          orgId,
          query,
          peopleLimit,
          offset,
          starredOnly
        );
        results.push(...fallbackResults.results);
        totalPeople = fallbackResults.total;
        usedFallback = true;
        warnings.push('People search using basic matching (full-text search unavailable)');
      } catch (fallbackErr: unknown) {
        console.error('People fallback search also failed:', fallbackErr);
        warnings.push('People search failed - some results may be missing');
      }
    }
  }

  const total = totalDepts + totalPeople;

  // Calculate query execution time
  const queryTimeMs = Date.now() - startTime;
  const slowQueryThreshold = 100; // ms
  const isSlowQuery = queryTimeMs > slowQueryThreshold;

  // Log performance metrics
  if (isSlowQuery) {
    console.warn(`[search] Slow query detected (${queryTimeMs}ms):`, {
      query,
      orgId,
      type: options.type,
      total,
      usedFallback,
    });
  }

  // Log zero-result searches for analysis
  if (total === 0 && query.trim().length > 0) {
    console.log(`[search] Zero results for query:`, {
      query,
      orgId,
      type: options.type,
      queryTimeMs,
    });
  }

  // Log general search metrics
  console.log(`[search] Query completed in ${queryTimeMs}ms:`, {
    query: query.substring(0, 50),
    total,
    resultCount: results.length,
  });

  return {
    query,
    total,
    results: results.slice(0, limit),
    pagination: {
      limit,
      offset,
      hasMore: total > offset + limit,
    },
    ...(warnings.length > 0 && { warnings }),
    ...(usedFallback && { usedFallback }),
    performance: {
      queryTimeMs,
      ...(isSlowQuery && { slowQuery: true }),
    },
  };
}

/**
 * Get autocomplete suggestions for search
 */
export async function getAutocompleteSuggestions(
  orgId: string,
  userId: string | undefined,
  query: string,
  limit: number = 5
): Promise<AutocompleteResponse> {
  // Start performance tracking
  const startTime = Date.now();

  // Check if organization exists and get its public status
  const org = db.prepare('SELECT is_public FROM organizations WHERE id = ?').get(orgId) as
    | { is_public: number }
    | undefined;

  if (!org) {
    const error = new Error('Organization not found') as { status?: number };
    error.status = 404;
    throw error;
  }

  const isPublic = org.is_public === 1;

  // Debug logging
  console.log('[autocomplete] Permission check:', {
    orgId,
    userId: userId ? 'present' : 'none',
    isPublic,
    willCheckPermission: userId && !isPublic,
  });

  // Check access permissions
  if (userId) {
    // Authenticated user: check membership for private orgs
    // For public orgs, allow access without membership check (avoids misleading audit logs)
    if (!isPublic) {
      // Private org - requires membership
      console.log('[autocomplete] Checking viewer permission for private org');
      // Use checkOrgAccess directly to ensure we are checking for 'viewer'
      const access = checkOrgAccess(orgId, userId);
      if (!access.hasAccess) {
        console.warn(`[autocomplete] Access Denied: User ${userId} has no access to org ${orgId}`);
        const error = new Error('Organization not found') as { status?: number };
        error.status = 404;
        throw error;
      }

      if (!access.role) {
        console.warn(
          `[autocomplete] Permission Denied: User ${userId} has no role in org ${orgId}`
        );
        const error = new Error('Insufficient permissions') as { status?: number };
        error.status = 403;
        throw error;
      }
    } else {
      console.log('[autocomplete] Skipping permission check for public org');
    }
    // Note: For public orgs, we still allow the user to search even if not a member
  } else {
    // Guest user: only allow access to public organizations
    if (!isPublic) {
      console.log('[autocomplete] Blocking guest user from private org');
      const error = new Error('Insufficient permissions') as { status?: number };
      error.status = 403;
      throw error;
    } else {
      console.log('[autocomplete] Allowing guest user to search public org');
    }
  }

  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) {
    return { suggestions: [] };
  }

  const suggestions: AutocompleteSuggestion[] = [];

  try {
    // Department name suggestions (exclude soft-deleted)
    const deptStmt = db.prepare(`
      SELECT DISTINCT d.name, 'department' as type
      FROM departments_fts
      JOIN departments d ON departments_fts.rowid = d.rowid
      WHERE departments_fts MATCH ?
        AND d.organization_id = ?
        AND d.deleted_at IS NULL
      LIMIT ?
    `);

    const deptRows = deptStmt.all(
      ftsQuery,
      orgId,
      Math.ceil(limit / 2)
    ) as DepartmentSuggestionRow[];
    suggestions.push(
      ...deptRows.map(
        (r): AutocompleteSuggestion => ({
          text: r.name,
          type: 'department',
          id: '', // Mock ID for snippet suggestions if needed
        })
      )
    );
  } catch (err: unknown) {
    console.error('Department autocomplete error:', err);
  }

  try {
    // Person name suggestions (exclude soft-deleted)
    const peopleStmt = db.prepare(`
      SELECT DISTINCT p.name, 'person' as type
      FROM people_fts
      JOIN people p ON people_fts.rowid = p.rowid
      JOIN departments d ON p.department_id = d.id
      WHERE people_fts MATCH ?
        AND d.organization_id = ?
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL
      LIMIT ?
    `);

    const remainingLimit = Math.max(1, limit - suggestions.length);
    const peopleRows = peopleStmt.all(ftsQuery, orgId, remainingLimit) as PersonSuggestionRow[];
    suggestions.push(
      ...peopleRows.map(
        (r): AutocompleteSuggestion => ({
          text: r.name,
          type: 'person',
          id: '', // Mock ID for snippet suggestions if needed
        })
      )
    );
  } catch (err: unknown) {
    console.error('People autocomplete error:', err);
  }

  // Log autocomplete performance
  const queryTimeMs = Date.now() - startTime;
  console.log(`[autocomplete] Query completed in ${queryTimeMs}ms:`, {
    query: query.substring(0, 30),
    suggestionCount: suggestions.length,
  });

  return { suggestions: suggestions.slice(0, limit) };
}
