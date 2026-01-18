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
  parent_id?: string | null;
  people_count?: number;
  // Person-specific fields
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  department_id?: string;
  department_name?: string;
  rank?: number;
}

export interface SearchOptions {
  query: string;
  type?: 'all' | 'departments' | 'people';
  limit?: number;
  offset?: number;
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
      highlight: escapeHtml(row.nameHighlight || row.descHighlight || row.customHighlight || row.name)
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
  offset: number
): { total: number; results: SearchResult[] } {
  // Query 1: Search in people name/title/email/phone
  const peopleSql = `
    SELECT
      p.id,
      p.name,
      p.title,
      p.email,
      p.phone,
      p.department_id,
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
  `;

  // Execute both queries
  const peopleRows = db.prepare(peopleSql).all(ftsQuery, orgId) as Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    department_id: string;
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
      highlight: escapeHtml(
        row.nameHighlight || row.titleHighlight || row.emailHighlight || row.customHighlight || row.name
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

  return { suggestions: suggestions.slice(0, limit) };
}
