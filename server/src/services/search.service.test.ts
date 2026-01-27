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

import { search, createSavedSearch, getSavedSearches, deleteSavedSearch } from './search.service.js';
import db from '../db.js';

describe('Search Service', () => {
  const orgId = 'org-123';
  const userId = 'user-123';

  beforeEach(() => {
    // Clean tables
    const tables = ['saved_searches', 'search_analytics', 'people', 'departments', 'organizations', 'users'];
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (e) {
        // Ignore if table doesn't exist (e.g. if migration failed silently, though it shouldn't)
        console.warn(`Failed to clear table ${table}:`, e);
      }
    }
    
    // Create Org and User
    db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(userId, 'test@example.com', 'hash', 'Test User', 'admin');
    db.prepare('INSERT INTO organizations (id, name, created_by_id, is_public) VALUES (?, ?, ?, ?)').run(orgId, 'Test Org', userId, 0);
    
    // Create Department
    db.prepare('INSERT INTO departments (id, organization_id, name, description) VALUES (?, ?, ?, ?)').run('dept-1', orgId, 'Software Engineering', 'Software development');
    
    // Create Person
    db.prepare('INSERT INTO people (id, department_id, name, title, email) VALUES (?, ?, ?, ?, ?)').run('person-1', 'dept-1', 'Alice Johnson', 'Senior Engineer', 'alice@example.com');
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

  it('should log analytics', async () => {
    await search(orgId, userId, { query: 'Engineering' });
    
    const analytics = db.prepare('SELECT * FROM search_analytics WHERE query = ?').get('Engineering') as any;
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
});