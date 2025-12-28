import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import departmentRoutes from './routes/departments.js';
import peopleRoutes from './routes/people.js';
import importRoutes from './routes/import.js';
import publicRoutes from './routes/public.js';
import usersRoutes from './routes/users.js';
import memberRoutes from './routes/members.js';
import invitationRoutes from './routes/invitations.js';
import auditRoutes from './routes/audit.js';
import searchRoutes from './routes/search.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import db from './db.js';
import { initializeSocket } from './socket.js';

dotenv.config();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET.includes('change-this-in-production')) {
  console.error('FATAL: Default JWT_SECRET detected in production. Set a secure secret.');
  process.exit(1);
}

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Trust proxy - required for rate limiting to work correctly behind Render's proxy
app.set('trust proxy', 1);

// CORS configuration - dynamic based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean) // Production: use env var
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ]; // Development: all local ports

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Socket.IO with the HTTP server
initializeSocket(server, allowedOrigins);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../dist');
  app.use(express.static(frontendPath));
}

// Health check with database connectivity test (must be before other routes)
app.get('/api/health', async (req, res) => {
  try {
    // Test database connectivity
    const dbCheck = db.prepare('SELECT 1 as ok').get();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbCheck.ok === 1 ? 'connected' : 'error',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', organizationRoutes);
app.use('/api', departmentRoutes);
app.use('/api', peopleRoutes);
app.use('/api', importRoutes);
app.use('/api', usersRoutes);
app.use('/api', memberRoutes);
app.use('/api', invitationRoutes);
app.use('/api', auditRoutes);
app.use('/api', searchRoutes);

// Serve index.html for all non-API routes (SPA support) in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const frontendPath = path.join(__dirname, '../dist');
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});
