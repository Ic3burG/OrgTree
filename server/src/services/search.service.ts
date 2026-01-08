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

interface SearchOptions {
  query: string;
  type?: 'all' | 'departments' | 'people';
  limit?: number;
  offset?: number;
}

interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface AutocompleteSuggestion {
  text: string;
  type: 'department' | 'person';
}

interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

interface DepartmentSearchRow {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  nameHighlight: string;
  descHighlight: string;
  peopleCount: number;
  rank: number;
}

interface PersonSearchRow {
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
  rank: number;
}

interface DepartmentSuggestionRow {
  name: string;
  type: 'department';
}

interface PersonSuggestionRow {
  name: string;
  type: 'person';
}

interface CountResult {
  count: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape special FTS5 characters in query to prevent syntax errors
 */
function escapeFtsQuery(query: string): string {
  // Remove special characters that could break FTS query
  return query.replace(/['"*(){}[\]^~\\:]/g, ' ').trim();
}

/**
 * Build FTS5 query with prefix matching for autocomplete behavior
 */
function buildFtsQuery(query: string, prefixMatch: boolean = true): string | null {
  const escaped = escapeFtsQuery(query);
  const terms = escaped.split(/\s+/).filter((t: string) => t.length > 0);

  if (terms.length === 0) return null;

  // Add prefix matching to last term (autocomplete behavior)
  if (prefixMatch && terms.length > 0) {
    const lastTerm = terms.pop();
    terms.push(`${lastTerm}*`);
  }

  return terms.join(' ');
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search departments using FTS5
 */
function searchDepartments(
  orgId: string,
  ftsQuery: string,
  limit: number,
  offset: number
): { total: number; results: SearchResult[] } {
  // Count total matches
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM departments_fts
    JOIN departments d ON departments_fts.rowid = d.rowid
    WHERE departments_fts MATCH ?
      AND d.organization_id = ?
  `);

  const countResult = countStmt.get(ftsQuery, orgId) as CountResult;
  const total = countResult.count;

  // Get matching departments with highlights
  const stmt = db.prepare(`
    SELECT
      d.id,
      d.name,
      d.description,
      d.parent_id as parentId,
      snippet(departments_fts, 0, '<mark>', '</mark>', '...', 32) as nameHighlight,
      snippet(departments_fts, 1, '<mark>', '</mark>', '...', 32) as descHighlight,
      (SELECT COUNT(*) FROM people WHERE department_id = d.id) as peopleCount,
      bm25(departments_fts) as rank
    FROM departments_fts
    JOIN departments d ON departments_fts.rowid = d.rowid
    WHERE departments_fts MATCH ?
      AND d.organization_id = ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(ftsQuery, orgId, limit, offset) as DepartmentSearchRow[];

  return {
    total,
    results: rows.map(
      (row): SearchResult => ({
        type: 'department',
        id: row.id,
        name: row.name,
        description: row.description,
        parentId: row.parentId,
        highlight: escapeHtml(row.nameHighlight || row.descHighlight)
          .replace(/&lt;mark&gt;/g, '<mark>')
          .replace(/&lt;\/mark&gt;/g, '</mark>'),
        peopleCount: row.peopleCount,
      })
    ),
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
  // Count total matches (people through department->org relationship)
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM people_fts
    JOIN people p ON people_fts.rowid = p.rowid
    JOIN departments d ON p.department_id = d.id
    WHERE people_fts MATCH ?
      AND d.organization_id = ?
  `);

  const countResult = countStmt.get(ftsQuery, orgId) as CountResult;
  const total = countResult.count;

  // Get matching people with highlights
  const stmt = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.title,
      p.email,
      p.phone,
      p.department_id as departmentId,
      d.name as departmentName,
      snippet(people_fts, 0, '<mark>', '</mark>', '...', 32) as nameHighlight,
      snippet(people_fts, 1, '<mark>', '</mark>', '...', 32) as titleHighlight,
      snippet(people_fts, 2, '<mark>', '</mark>', '...', 32) as emailHighlight,
      bm25(people_fts) as rank
    FROM people_fts
    JOIN people p ON people_fts.rowid = p.rowid
    JOIN departments d ON p.department_id = d.id
    WHERE people_fts MATCH ?
      AND d.organization_id = ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(ftsQuery, orgId, limit, offset) as PersonSearchRow[];

  return {
    total,
    results: rows.map(
      (row): SearchResult => ({
        type: 'person',
        id: row.id,
        name: row.name,
        title: row.title,
        email: row.email,
        phone: row.phone,
        departmentId: row.departmentId,
        departmentName: row.departmentName,
        highlight: escapeHtml(row.nameHighlight || row.titleHighlight || row.emailHighlight)
          .replace(/&lt;mark&gt;/g, '<mark>')
          .replace(/&lt;\/mark&gt;/g, '</mark>'),
      })
    ),
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
  const ftsQuery = buildFtsQuery(query, true);
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

  const ftsQuery = buildFtsQuery(query, true);
  if (!ftsQuery) {
    return { suggestions: [] };
  }

  const suggestions: AutocompleteSuggestion[] = [];

  try {
    // Department name suggestions
    const deptStmt = db.prepare(`
      SELECT DISTINCT d.name, 'department' as type
      FROM departments_fts
      JOIN departments d ON departments_fts.rowid = d.rowid
      WHERE departments_fts MATCH ?
        AND d.organization_id = ?
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
    // Person name suggestions
    const peopleStmt = db.prepare(`
      SELECT DISTINCT p.name, 'person' as type
      FROM people_fts
      JOIN people p ON people_fts.rowid = p.rowid
      JOIN departments d ON p.department_id = d.id
      WHERE people_fts MATCH ?
        AND d.organization_id = ?
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
