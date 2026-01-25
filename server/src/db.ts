import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from './db-init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
// Use DATABASE_URL environment variable or fallback to development database
let dbPath;
if (process.env.DATABASE_URL) {
  // Remove 'file:' prefix if present
  dbPath = process.env.DATABASE_URL.replace(/^file:/, '');
} else {
  // Development fallback
  dbPath = join(__dirname, '..', 'database.db');
}

const db = new Database(dbPath);

console.log('Initializing database at:', dbPath);
await initializeDatabase(db);

export default db;
