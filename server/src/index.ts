/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
import v1Router from './routes/v1/index.js';
import { scheduleFtsMaintenance } from './services/fts-scheduler.service.js';
import { scheduleTransferExpiration } from './services/transfer-expiration-scheduler.service.js';
import { scheduleInvitationReminders } from './services/invitation-scheduler.service.js';
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

// API Routes
// Mount v1 API
app.use('/api/v1', v1Router);

// Legacy API Alias (to be removed in future versions)
app.use(
  '/api',
  (req, _res, next) => {
    if (!req.path.startsWith('/v1')) {
      logger.warn(
        `Legacy API access detected: ${req.method} ${req.originalUrl}. Please migrate to /api/v1/`,
        {
          path: req.path,
          method: req.method,
          ip: req.ip,
        }
      );
    }
    next();
  },
  v1Router
);

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
