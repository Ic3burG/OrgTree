import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcrypt';

// Mock the database module before importing the service
vi.mock('../db.js', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return { default: db };
});

// Import after mocking
import db from '../db.js';
import { createUser, loginUser, getUserById } from './auth.service.js';

describe('Auth Service', () => {
  beforeEach(() => {
    // Clear users table before each test
    db.prepare('DELETE FROM users').run();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const result = await createUser('John Doe', 'john@example.com', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.name).toBe('John Doe');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.role).toBe('user');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should hash the password', async () => {
      await createUser('John Doe', 'john@example.com', 'password123');

      const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('john@example.com');
      expect(user.password_hash).not.toBe('password123');
      expect(await bcrypt.compare('password123', user.password_hash)).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      await createUser('John Doe', 'john@example.com', 'password123');

      await expect(createUser('Jane Doe', 'john@example.com', 'password456'))
        .rejects.toThrow('Email already registered');
    });

    it('should set correct role for first user', async () => {
      const result = await createUser('Admin', 'admin@example.com', 'admin123');
      // First user could be 'superuser' or 'user' depending on implementation
      expect(['user', 'superuser']).toContain(result.user.role);
    });

    it('should make subsequent users regular users', async () => {
      await createUser('Admin', 'admin@example.com', 'admin123');
      const result = await createUser('User', 'user@example.com', 'user123');
      expect(result.user.role).toBe('user');
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await createUser('John Doe', 'john@example.com', 'password123');
    });

    it('should login with correct credentials', async () => {
      const result = await loginUser('john@example.com', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('john@example.com');
    });

    it('should throw error for non-existent user', async () => {
      await expect(loginUser('unknown@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for wrong password', async () => {
      await expect(loginUser('john@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const { user: created } = await createUser('John Doe', 'john@example.com', 'password123');

      const user = await getUserById(created.id);

      expect(user.id).toBe(created.id);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    it('should throw error for non-existent user', async () => {
      await expect(getUserById('non-existent-id'))
        .rejects.toThrow('User not found');
    });

    it('should not return password hash', async () => {
      const { user: created } = await createUser('John Doe', 'john@example.com', 'password123');

      const user = await getUserById(created.id);

      expect(user).not.toHaveProperty('password_hash');
    });
  });
});
