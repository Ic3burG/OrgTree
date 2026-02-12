import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
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
import savedSearchesRoutes from './routes/saved-searches.js';
import bulkRoutes from './routes/bulk.js';
import csrfRoutes from './routes/csrf.js';
import backupRoutes from './routes/backup.js';
import passkeyRoutes from './routes/passkey.js';
import totpRoutes from './routes/totp.js';
import customFieldsRoutes from './routes/custom-fields.js';
import metricsRoutes from './routes/metrics.js';
import analyticsRoutes from './routes/analytics.js';
import orgAnalyticsRoutes from './routes/org-analytics.js';
import gedsRoutes from './routes/geds.js';
import gedsImportRoutes from './routes/geds-import.js';
import ownershipTransfersRoutes from './routes/ownership-transfers.js';
import { scheduleFtsMaintenance } from './services/fts-scheduler.service.js';
import { scheduleTransferExpiration } from './services/transfer-expiration-scheduler.service.js';
import { scheduleInvitationReminders } from './services/invitation-scheduler.service.js';
import ftsMaintenanceRoutes from './routes/fts-maintenance.js';
import versionRoutes from './routes/version.js';
import orgMembershipCheckRoutes from './routes/org-membership-check.js';
import fixOrgOwnersRoutes from './routes/fix-org-owners.js';
import fixOrgOwnersSimpleRoutes from './routes/fix-org-owners-simple.js';
import { validateCsrf } from './middleware/csrf.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import db from './db.js';
import { initializeSocket, emitToAdminMetrics } from './socket.js';
import { cleanupExpiredTokens } from './services/auth.service.js';
import { getRealtimeSnapshot } from './services/metrics.service.js';
import { setupGlobalErrorHandlers, Sentry } from './sentry.js';

// Only load dotenv in development - Render sets env vars directly in production
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config();
}

// Initialize global error handlers
setupGlobalErrorHandlers();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.JWT_SECRET.includes('change-this-in-production')
) {
  console.error('FATAL: Default JWT_SECRET detected in production. Set a secure secret.');
  process.exit(1);
}

const formattingViolation = 'this should fail prettier';
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Trust proxy - required for rate limiting to work correctly behind Render's proxy
app.set('trust proxy', 1);

// Sentry request tracing is automatically handled by Sentry.init() in v10+

// CORS configuration - dynamic based on environment
const allowedOrigins: string[] =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter((origin): origin is string => Boolean(origin)) // Production: use env var
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3000',
      ]; // Development: all local ports

app.use(
  cors({
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Security headers - protects against XSS, clickjacking, MIME sniffing, etc.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'ws:'], // WebSocket connections
        fontSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'], // For PDF/export workers
        objectSrc: ["'none'"], // Block dangerous plugins (Flash, Java, etc.)
        baseUri: ["'self'"], // Prevent base tag hijacking
        formAction: ["'self'"], // Restrict form submissions to same origin
        frameAncestors: ["'none'"], // Prevent clickjacking (like X-Frame-Options: DENY)
        upgradeInsecureRequests: [], // Auto-upgrade HTTP to HTTPS
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for Swagger UI
  })
);

app.use(express.json());
app.use(cookieParser()); // Required for CSRF cookie validation
app.use(metricsMiddleware); // Track API request timing

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

// Load and serve OpenAPI documentation
const openApiPath = path.join(__dirname, 'openapi.yaml');
const openApiSpec = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'OrgTree API Documentation',
  })
);

// Serve raw OpenAPI spec
app.get('/api/openapi.yaml', (_req, res) => {
  res.type('text/yaml').send(fs.readFileSync(openApiPath, 'utf8'));
});
app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// Health check with database connectivity test and system metrics
app.get('/api/health', async (_req, res) => {
  try {
    // Test database connectivity
    const dbCheck = db.prepare('SELECT 1 as ok').get() as { ok: number };

    // Get database mode for verification
    const journalMode = db.pragma('journal_mode', { simple: true }) as string;
    const busyTimeout = db.pragma('busy_timeout', { simple: true }) as number;

    // Get process and system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Security: Don't expose sensitive environment details or full paths
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: {
        seconds: Math.floor(uptime),
        human: new Date(uptime * 1000).toISOString().substr(11, 8),
      },
      database: {
        status: dbCheck.ok === 1 ? 'connected' : 'error',
        journal_mode: journalMode,
        busy_timeout_ms: busyTimeout,
      },
      process: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        },
      },
    });
  } catch (error: unknown) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: (error as Error).message,
    });
  }
});

// DEBUG: Simple test endpoint with no middleware (temporary)
app.get('/api/admin/backup/test-simple', (_req, res) => {
  logger.info('Simple backup test endpoint hit (no middleware)');
  res.json({
    message: 'Direct test endpoint working',
    timestamp: new Date().toISOString(),
    envVarConfigured: !!process.env.BACKUP_API_TOKEN,
    envVarLength: process.env.BACKUP_API_TOKEN?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  });
});

// API Routes
// CSRF token endpoint (must be before CSRF validation middleware)
app.use('/api', csrfRoutes);

// Version endpoint (no authentication required)
app.use('/api', versionRoutes);

// Debug endpoints (authentication required, no CSRF for GET)
app.use('/api', orgMembershipCheckRoutes);

// Migration endpoints (GET version without CSRF for easy testing)
app.use('/api', fixOrgOwnersSimpleRoutes);

// Backup and rollback endpoints (custom authentication, no CSRF required for CI/CD)
app.use('/api', backupRoutes);

// Public routes (no authentication or CSRF required)
app.use('/api/auth', authRoutes);
app.use('/api/auth/passkey', passkeyRoutes);
app.use('/api/auth/2fa', totpRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/geds', gedsRoutes);

// Protected routes (require CSRF validation for state-changing operations)
app.use('/api', validateCsrf); // Apply CSRF middleware to all routes below

app.use('/api', organizationRoutes);
app.use('/api', orgAnalyticsRoutes);
app.use('/api', ownershipTransfersRoutes);
app.use('/api', departmentRoutes);
app.use('/api', peopleRoutes);
app.use('/api', importRoutes);
app.use('/api', gedsImportRoutes);
app.use('/api', customFieldsRoutes);
app.use('/api', usersRoutes);
app.use('/api', memberRoutes);
app.use('/api', invitationRoutes);
app.use('/api', auditRoutes);
app.use('/api', searchRoutes);
app.use('/api', savedSearchesRoutes);
app.use('/api', bulkRoutes);
app.use('/api', metricsRoutes);
app.use('/api/fts-maintenance', ftsMaintenanceRoutes);
app.use('/api', fixOrgOwnersRoutes);

// Serve index.html for all non-API routes (SPA support) in production
if (process.env.NODE_ENV === 'production') {
  app.get(/.*/, (_req, res) => {
    const frontendPath = path.join(__dirname, '../dist');
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Sentry error handler (v10+ API) - must be before custom error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Custom error handler (must be last)
app.use(errorHandler);

// Only listen if this file is the main module
// Using a check safe for ESM
import { fileURLToPath as fUrl } from 'url';
const isMainModule = process.argv[1] === fUrl(import.meta.url);

if (isMainModule) {
  server.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });

    // Schedule token cleanup job - runs every hour
    const TOKEN_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    setInterval(() => {
      cleanupExpiredTokens();
    }, TOKEN_CLEANUP_INTERVAL);

    // Schedule FTS maintenance (nightly integrity checks and optimization)
    scheduleFtsMaintenance();

    // Schedule ownership transfer expiration (daily at 2:00 AM)
    scheduleTransferExpiration();

    // Schedule invitation reminders (daily at 09:00 AM)
    scheduleInvitationReminders();

    // Run initial cleanup on startup
    cleanupExpiredTokens();

    logger.info('Token cleanup job scheduled', { intervalMs: TOKEN_CLEANUP_INTERVAL });

    // Schedule real-time metrics emission - every 5 seconds
    const METRICS_EMIT_INTERVAL = 5 * 1000; // 5 seconds
    setInterval(() => {
      const snapshot = getRealtimeSnapshot();
      emitToAdminMetrics('metrics:update', snapshot);
    }, METRICS_EMIT_INTERVAL);

    logger.info('Metrics emission scheduled', { intervalMs: METRICS_EMIT_INTERVAL });
  });
}

export default app;
