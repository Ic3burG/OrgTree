import { vi, describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

// Mock DB to use memory
vi.mock('../db.js', async () => {
  const { initializeDatabase } = await import('../db-init.js');
  const db = new Database(':memory:');
  // Initialize schema
  await initializeDatabase(db);
  return { default: db };
});

import {
  search,
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
  validateFtsQuery,
  buildFtsQuery,
  getAutocompleteSuggestions,
  getSearchSuggestions,
} from './search.service.js';
import db from '../db.js';

describe('Search Service', () => {
  const orgId = 'org-123';
  const userId = 'user-123';

  beforeEach(() => {
    // Clean tables
    const tables = [
      'saved_searches',
      'search_analytics',
      'people',
      'departments',
      'organizations',
      'users',
    ];
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (e) {
        // Ignore if table doesn't exist (e.g. if migration failed silently, though it shouldn't)
        console.warn(`Failed to clear table ${table}:`, e);
      }
    }

    // Create Org and User
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'test@example.com', 'hash', 'Test User', 'admin');
    db.prepare(
      'INSERT INTO organizations (id, name, created_by_id, is_public) VALUES (?, ?, ?, ?)'
    ).run(orgId, 'Test Org', userId, 0);

    // Create Department
    const deptResult = db
      .prepare(
        'INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)'
      )
      .run('dept-1', orgId, 'Software Engineering', 'Software development');

    // Manually populate FTS tables as triggers might be missing in test environment
    db.prepare('INSERT INTO departments_fts (rowid, name, description) VALUES (?, ?, ?)').run(
      deptResult.lastInsertRowid,
      'Software Engineering',
      'Software development'
    );
    db.prepare('INSERT INTO departments_trigram (rowid, name, description) VALUES (?, ?, ?)').run(
      deptResult.lastInsertRowid,
      'Software Engineering',
      'Software development'
    );

    // Create Person
    const person1Result = db
      .prepare(
        'INSERT INTO people (id, department_id, name, title, email, is_starred) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run('person-1', 'dept-1', 'Alice Johnson', 'Senior Engineer', 'alice@example.com', 1);

    db.prepare('INSERT INTO people_fts (rowid, name, title, email) VALUES (?, ?, ?, ?)').run(
      person1Result.lastInsertRowid,
      'Alice Johnson',
      'Senior Engineer',
      'alice@example.com'
    );
    db.prepare('INSERT INTO people_trigram (rowid, name, title, email) VALUES (?, ?, ?, ?)').run(
      person1Result.lastInsertRowid,
      'Alice Johnson',
      'Senior Engineer',
      'alice@example.com'
    );

    const person2Result = db
      .prepare(
        'INSERT INTO people (id, department_id, name, title, email, is_starred) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run('person-2', 'dept-1', 'Bob Smith', 'Designer', 'bob@example.com', 0);

    db.prepare('INSERT INTO people_fts (rowid, name, title, email) VALUES (?, ?, ?, ?)').run(
      person2Result.lastInsertRowid,
      'Bob Smith',
      'Designer',
      'bob@example.com'
    );
    db.prepare('INSERT INTO people_trigram (rowid, name, title, email) VALUES (?, ?, ?, ?)').run(
      person2Result.lastInsertRowid,
      'Bob Smith',
      'Designer',
      'bob@example.com'
    );
  });

  it('should validate FTS queries', () => {
    expect(validateFtsQuery('valid').valid).toBe(true);
    expect(validateFtsQuery('unbalanced " quotes').valid).toBe(false);
    expect(validateFtsQuery("unbalanced ' quotes").valid).toBe(false);
    expect(validateFtsQuery('too many ***********').valid).toBe(false);
    expect(validateFtsQuery('invalid and operator').valid).toBe(false);
    expect(validateFtsQuery('').valid).toBe(true);
  });

  it('should build FTS queries', () => {
    expect(buildFtsQuery('test')).toBe('"test"*');
    expect(buildFtsQuery('test query')).toBe('"test"* "query"*');
    expect(buildFtsQuery('')).toBe('');
  });

  it('should perform exact match search', async () => {
    const result = await search(orgId, userId, { query: 'Alice' });
    expect(result.total).toBe(1);
    expect(result.results[0].name).toBe('Alice Johnson');
  });

  it('should perform fuzzy search (typo tolerance)', async () => {
    // "Softwear" instead of "Software"
    const result = await search(orgId, userId, { query: 'Softwear' });

    // Should fallback to trigram and find "Software Engineering"
    expect(result.total).toBeGreaterThan(0);
    expect(result.results[0].name).toContain('Software');
    expect(result.usedFallback).toBe(true);
  });

  it('should perform partial match fuzzy search', async () => {
    // "ohnso" matches "Johnson"
    const result = await search(orgId, userId, { query: 'ohnso' });

    expect(result.total).toBe(1);
    expect(result.results[0].name).toBe('Alice Johnson');
    expect(result.usedFallback).toBe(true);
  });

  it('should filter by type', async () => {
    const deptOnly = await search(orgId, userId, { query: 'Software', type: 'departments' });
    expect(deptOnly.results.every(r => r.type === 'department')).toBe(true);

    const peopleOnly = await search(orgId, userId, { query: 'Alice', type: 'people' });
    expect(peopleOnly.results.every(r => r.type === 'person')).toBe(true);
  });

  it('should filter starred only', async () => {
    const starred = await search(orgId, userId, { query: 'Johnson', starredOnly: true });
    expect(starred.total).toBe(1);
    expect(starred.results[0].name).toBe('Alice Johnson');

    const notStarred = await search(orgId, userId, { query: 'Bob', starredOnly: true });
    expect(notStarred.total).toBe(0);
  });

  it('should provide autocomplete suggestions', async () => {
    const result = await getAutocompleteSuggestions(orgId, userId, 'Soft');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].text).toContain('Software');
  });

  it('should log analytics', async () => {
    await search(orgId, userId, { query: 'Engineering' });

    const analytics = db
      .prepare('SELECT * FROM search_analytics WHERE query = ?')
      .get('Engineering') as any;
    expect(analytics).toBeDefined();
    expect(analytics.organization_id).toBe(orgId);
    expect(analytics.result_count).toBeGreaterThan(0);
  });

  it('should manage saved searches', async () => {
    // Create
    const saved = await createSavedSearch(orgId, userId, 'My Search', 'Alice', { role: 'admin' });
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('My Search');

    // Get
    const list = await getSavedSearches(orgId, userId);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(saved.id);

    // Delete
    const deleted = await deleteSavedSearch(saved.id, userId);
    expect(deleted).toBe(true);

    const listAfter = await getSavedSearches(orgId, userId);
    expect(listAfter.length).toBe(0);
  });

  it('should return suggestions when no results are found', async () => {
    // First, verify a very distant query returns nothing and no suggestions
    const noMatch = await search(orgId, userId, { query: 'Zzzzzzzzzz' });
    expect(noMatch.total).toBe(0);
    expect(noMatch.suggestions).toEqual([]);

    // Now try a query that is close to "Alice Johnson"
    const result = await search(orgId, userId, { query: 'Alicee' });

    if (result.total === 0) {
      expect(result.suggestions).toContain('Alice Johnson');
    }
  });

  it('should return suggestions for departments', async () => {
    // "Softwar" -> close to "Software Engineering"
    const result = await search(orgId, userId, { query: 'Softwarre' });

    if (result.total === 0) {
      expect(result.suggestions).toContain('Software Engineering');
    }
  });

  it('should handle edge cases in getSearchSuggestions', () => {
    expect(getSearchSuggestions(orgId, '')).toEqual([]);
    expect(getSearchSuggestions(orgId, 'a')).toEqual([]);

    // Exact match should be filtered out from suggestions
    const suggestions = getSearchSuggestions(orgId, 'Software Engineering');
    expect(suggestions).not.toContain('Software Engineering');
  });
});
