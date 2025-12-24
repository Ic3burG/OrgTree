import db from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export async function createUser(name, email, password) {
  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.status = 400;
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const userId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', ?, ?)
  `).run(userId, name, email, passwordHash, now, now);

  const user = db.prepare(`
    SELECT id, name, email, role, created_at
    FROM users WHERE id = ?
  `).get(userId);

  // Generate token
  const token = generateToken(user);

  return { user, token };
}

export async function loginUser(email, password) {
  // Find user
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  // Generate token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password === 1
    },
    token,
  };
}

export async function getUserById(id) {
  const user = db.prepare(`
    SELECT id, name, email, role, must_change_password, created_at
    FROM users WHERE id = ?
  `).get(id);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    createdAt: user.created_at
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
