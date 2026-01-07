# Multi-stage Dockerfile for OrgTree
# Supports both development and production builds

# ==============================================================================
# Base stage - shared between dev and prod
# ==============================================================================
FROM node:20-alpine AS base

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# ==============================================================================
# Development stage
# ==============================================================================
FROM base AS development

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (including devDependencies)
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 5173 3001

# Development command (override in docker-compose)
CMD ["npm", "run", "dev"]

# ==============================================================================
# Build stage - builds the frontend
# ==============================================================================
FROM base AS builder

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# ==============================================================================
# Production stage
# ==============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy server package files
COPY server/package*.json ./server/

# Install production dependencies only
RUN cd server && npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server/src ./server/src

# Create data directory for SQLite
RUN mkdir -p /data

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/database.db

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Run production server
WORKDIR /app/server
CMD ["npm", "start"]
