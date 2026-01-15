import db from '../db.js';
import { requireOrgPermission } from './member.service.js';
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
  parentId?: string | null;
  peopleCount?: number;
  // Person-specific fields
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  departmentId?: string;
  departmentName?: string;
}

interface CountResult {
  count: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
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

  const stmt = db.prepare(`
    SELECT 
      cv.entity_id, 
      cv.entity_type,
      cd.field_key, 
      cv.value
    FROM custom_field_values cv
    JOIN custom_field_definitions cd ON cv.field_id = cd.id
    WHERE cv.organization_id = ?
      AND cv.entity_id IN (${placeholders})
      AND cv.deleted_at IS NULL
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
 */
function searchDepartments(
  orgId: string,
  ftsQuery: string,
  limit: number,
  offset: number
): { total: number; results: SearchResult[] } {
  // Use UNION to combine matches from departments_fts and custom_fields_fts
  // This avoids "unable to use function MATCH in the requested context" errors
  // that occur when using OR with MATCH on nullable LEFT JOIN tables

  const sql = `
    SELECT
      id,
      name,
      description,
      parentId,
      MAX(nameHighlight) as nameHighlight,
      MAX(descHighlight) as descHighlight,
      MAX(customHighlight) as customHighlight,
      peopleCount,
      MIN(rank) as rank
    FROM (
      -- Search in department name/description
      SELECT
        d.id,
        d.name,
        d.description,
        d.parent_id as parentId,
        snippet(df.departments_fts, 0, '<mark>', '</mark>', '...', 32) as nameHighlight,
        snippet(df.departments_fts, 1, '<mark>', '</mark>', '...', 32) as descHighlight,
        NULL as customHighlight,
        (SELECT COUNT(*) FROM people WHERE department_id = d.id AND deleted_at IS NULL) as peopleCount,
        bm25(df.departments_fts) as rank
      FROM departments_fts df
      JOIN departments d ON d.rowid = df.rowid
      WHERE df.departments_fts MATCH ?
        AND d.organization_id = ?
        AND d.deleted_at IS NULL

      UNION ALL

      -- Search in custom fields
      SELECT
        d.id,
        d.name,
        d.description,
        d.parent_id as parentId,
        NULL as nameHighlight,
        NULL as descHighlight,
        snippet(cf.custom_fields_fts, 0, '<mark>', '</mark>', '...', 32) as customHighlight,
        (SELECT COUNT(*) FROM people WHERE department_id = d.id AND deleted_at IS NULL) as peopleCount,
        bm25(cf.custom_fields_fts) as rank
      FROM custom_fields_fts cf
      JOIN departments d ON d.id = cf.entity_id
      WHERE cf.custom_fields_fts MATCH ?
        AND cf.entity_type = 'department'
        AND d.organization_id = ?
        AND d.deleted_at IS NULL
    )
    GROUP BY id
    ORDER BY rank
    LIMIT ? OFFSET ?
  `;

  // Count query
  const countSql = `
    SELECT COUNT(DISTINCT id) as count FROM (
      SELECT d.id
      FROM departments_fts df
      JOIN departments d ON d.rowid = df.rowid
      WHERE df.departments_fts MATCH ?
        AND d.organization_id = ?
        AND d.deleted_at IS NULL

      UNION ALL

      SELECT d.id
      FROM custom_fields_fts cf
      JOIN departments d ON d.id = cf.entity_id
      WHERE cf.custom_fields_fts MATCH ?
        AND cf.entity_type = 'department'
        AND d.organization_id = ?
        AND d.deleted_at IS NULL
    )
  `;

  const countResult = db.prepare(countSql).get(ftsQuery, orgId, ftsQuery, orgId) as CountResult;
  const total = countResult.count;

  const rows = db.prepare(sql).all(ftsQuery, orgId, ftsQuery, orgId, limit, offset) as Array<{
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    nameHighlight: string;
    descHighlight: string;
    customHighlight: string;
    peopleCount: number;
  }>;

  const results = rows.map(
    (row): SearchResult => ({
      type: 'department',
      id: row.id,
      name: row.name,
      description: row.description,
      parentId: row.parentId,
      highlight: escapeHtml(row.nameHighlight || row.descHighlight || row.customHighlight)
        .replace(/&lt;mark&gt;/g, '<mark>')
        .replace(/&lt;&#x2F;mark&gt;/g, '</mark>')
        .replace(/&lt;\/mark&gt;/g, '</mark>'),
      peopleCount: row.peopleCount,
    })
  );

  return {
    total,
    results: attachCustomFields(orgId, results),
  };
}

/**
 * Search people using FTS5
 */
function searchPeople(
  orgId: string,
  ftsQuery: string,
  limit: number,
  offset: number
): { total: number; results: SearchResult[] } {
  // Use UNION to combine matches from people_fts and custom_fields_fts

  const sql = `
    SELECT
      id,
      name,
      title,
      email,
      phone,
      departmentId,
      departmentName,
      MAX(nameHighlight) as nameHighlight,
      MAX(titleHighlight) as titleHighlight,
      MAX(emailHighlight) as emailHighlight,
      MAX(customHighlight) as customHighlight,
      MIN(rank) as rank
    FROM (
      -- Search in people fields
      SELECT
        p.id,
        p.name,
        p.title,
        p.email,
        p.phone,
        p.department_id as departmentId,
        d.name as departmentName,
        snippet(pf.people_fts, 0, '<mark>', '</mark>', '...', 32) as nameHighlight,
        snippet(pf.people_fts, 1, '<mark>', '</mark>', '...', 32) as titleHighlight,
        snippet(pf.people_fts, 2, '<mark>', '</mark>', '...', 32) as emailHighlight,
        NULL as customHighlight,
        bm25(pf.people_fts) as rank
      FROM people_fts pf
      JOIN people p ON p.rowid = pf.rowid
      JOIN departments d ON p.department_id = d.id
      WHERE pf.people_fts MATCH ?
        AND d.organization_id = ?
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL

      UNION ALL

      -- Search in custom fields
      SELECT
        p.id,
        p.name,
        p.title,
        p.email,
        p.phone,
        p.department_id as departmentId,
        d.name as departmentName,
        NULL as nameHighlight,
        NULL as titleHighlight,
        NULL as emailHighlight,
        snippet(cf.custom_fields_fts, 0, '<mark>', '</mark>', '...', 32) as customHighlight,
        bm25(cf.custom_fields_fts) as rank
      FROM custom_fields_fts cf
      JOIN people p ON p.id = cf.entity_id
      JOIN departments d ON p.department_id = d.id
      WHERE cf.custom_fields_fts MATCH ?
        AND cf.entity_type = 'person'
        AND d.organization_id = ?
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL
    )
    GROUP BY id
    ORDER BY rank
    LIMIT ? OFFSET ?
  `;

  // Count query
  const countSql = `
    SELECT COUNT(DISTINCT id) as count FROM (
      SELECT p.id
      FROM people_fts pf
      JOIN people p ON p.rowid = pf.rowid
      JOIN departments d ON p.department_id = d.id
      WHERE pf.people_fts MATCH ?
        AND d.organization_id = ?
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL

      UNION ALL

      SELECT p.id
      FROM custom_fields_fts cf
      JOIN people p ON p.id = cf.entity_id
      JOIN departments d ON p.department_id = d.id
      WHERE cf.custom_fields_fts MATCH ?
        AND cf.entity_type = 'person'
        AND d.organization_id = ?
        AND p.deleted_at IS NULL
        AND d.deleted_at IS NULL
    )
  `;

  const countResult = db.prepare(countSql).get(ftsQuery, orgId, ftsQuery, orgId) as CountResult;
  const total = countResult.count;

  const rows = db.prepare(sql).all(ftsQuery, orgId, ftsQuery, orgId, limit, offset) as Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    departmentId: string;
    departmentName: string;
    nameHighlight: string;
    titleHighlight: string;
    emailHighlight: string;
    customHighlight: string;
  }>;

  const results = rows.map(
    (row): SearchResult => ({
      type: 'person',
      id: row.id,
      name: row.name,
      title: row.title,
      email: row.email,
      phone: row.phone,
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      highlight: escapeHtml(
        row.nameHighlight || row.titleHighlight || row.emailHighlight || row.customHighlight
      )
        .replace(/&lt;mark&gt;/g, '<mark>')
        .replace(/&lt;&#x2F;mark&gt;/g, '</mark>')
        .replace(/&lt;\/mark&gt;/g, '</mark>'),
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
export function search(orgId: string, userId: string, options: SearchOptions): SearchResponse {
  // Verify user has access to this organization
  requireOrgPermission(orgId, userId, 'viewer');

  const { query, type = 'all', limit = 20, offset = 0 } = options;

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

  // Search departments if requested
  if (type === 'all' || type === 'departments') {
    try {
      const deptResults = searchDepartments(orgId, ftsQuery, limit, offset);
      results.push(...deptResults.results);
      totalDepts = deptResults.total;
    } catch (err: unknown) {
      console.error('Department search error:', err);
    }
  }

  // Search people if requested
  if (type === 'all' || type === 'people') {
    try {
      // Adjust limit for people if we already have department results
      const peopleLimit = type === 'all' ? Math.max(1, limit - results.length) : limit;
      const peopleResults = searchPeople(orgId, ftsQuery, peopleLimit, offset);
      results.push(...peopleResults.results);
      totalPeople = peopleResults.total;
    } catch (err: unknown) {
      console.error('People search error:', err);
    }
  }

  const total = totalDepts + totalPeople;

  return {
    query,
    total,
    results: results.slice(0, limit),
    pagination: {
      limit,
      offset,
      hasMore: total > offset + limit,
    },
  };
}

/**
 * Get autocomplete suggestions for search
 */
export function getAutocompleteSuggestions(
  orgId: string,
  userId: string,
  query: string,
  limit: number = 5
): AutocompleteResponse {
  // Verify user has access to this organization
  requireOrgPermission(orgId, userId, 'viewer');

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
        })
      )
    );
  } catch (err: unknown) {
    console.error('People autocomplete error:', err);
  }

  return { suggestions: suggestions.slice(0, limit) };
}
