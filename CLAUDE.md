# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OrgTree is a full-stack organizational directory and visualization platform built with React (frontend) and Node.js/Express (backend). The application allows users to create, manage, and visualize organizational hierarchies with real-time collaboration, role-based permissions, and public sharing capabilities.

## Common Commands

### Development

```bash
# Frontend development (from root)
npm run dev                    # Start Vite dev server on localhost:3000

# Backend development (from root)
cd server && npm run dev       # Start Node.js with --watch on localhost:3001

# Full stack testing
npm test                       # Run frontend tests only
npm run test:all               # Run both frontend and backend tests
cd server && npm test          # Run backend tests only
npm run test:coverage          # Frontend tests with coverage
npm run test:watch             # Watch mode for frontend tests
```

### Linting and Formatting

```bash
# Frontend
npm run lint                   # ESLint check on src/
npm run lint:fix               # Auto-fix ESLint issues
npm run format                 # Format with Prettier
npm run format:check           # Check formatting without fixing

# Backend
cd server && npm run lint      # ESLint check on server/src/ and server/scripts/
cd server && npm run lint:fix  # Auto-fix ESLint issues
cd server && npm run format    # Format with Prettier

# Both (from root)
npm run lint:all               # Lint frontend and backend
```

### Production

```bash
# Build and run production
npm run build                  # Build frontend with Vite (outputs to dist/)
cd server && npm start         # Start production server (serves frontend from dist/)

# Database backups (from server/)
cd server && npm run backup                # Create backup
cd server && npm run backup:list           # List all backups
cd server && npm run backup:stats          # Show backup statistics
```

## Architecture

### Monorepo Structure

This is a monorepo with separate frontend and backend:
- **Frontend**: Root directory (React + Vite)
- **Backend**: `server/` directory (Express + SQLite)
- Each has its own `package.json` and `node_modules`
- Production: Backend serves built frontend from `dist/`

### Database

**Technology**: SQLite with `better-sqlite3`
**Location**:
- Development: `server/database.db`
- Production: Configured via `DATABASE_URL` env var (typically `/data/database.db` on Render)

**Schema** (defined in `server/src/db.js`):
- `users` - User accounts with roles (user, admin, superuser)
- `organizations` - Organizations with sharing settings
- `org_members` - Many-to-many relationship (users ↔ organizations) with roles (owner, admin, editor, viewer)
- `departments` - Hierarchical department structure (self-referencing via `parent_id`)
- `people` - People belonging to departments
- `invitations` - Email invitations with expiry
- `audit_logs` - Change history (1-year retention)
- `refresh_tokens` - JWT refresh tokens (httpOnly cookies)

**Key Features**:
- Foreign key constraints enabled
- Soft deletes via `deleted_at` timestamp
- Full-text search (FTS5) for departments and people (see `server/src/db.js:200+`)
- Migrations handled inline in `db.js` (check column existence, add if missing)

### Authentication & Authorization

**Token Strategy**: Dual-token system (access + refresh)
- **Access Token**: Short-lived JWT (15 min), stored in localStorage, sent via Authorization header
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie, used to renew access token
- Auto-refresh at 80% of token lifetime (see `src/api/client.js:151`)

**Roles**:
- **System-level** (users table): `user`, `admin`, `superuser`
  - `superuser`: Full system access, user management, cross-org audit logs
  - `admin`: Standard user with some privileges
  - `user`: Default role
- **Organization-level** (org_members table): `owner`, `admin`, `editor`, `viewer`
  - Checked via `checkOrgAccess()` in `server/src/services/member.service.js`
  - Owner cannot be removed or demoted

**Session Management**:
- Multiple concurrent sessions supported per user
- Each refresh token tracked in database with device info
- Users can view active sessions and revoke them

### Real-Time Collaboration

**Technology**: Socket.IO with JWT authentication

**Architecture**:
- Socket server initialized in `server/src/socket.js`
- Clients authenticate via `socket.handshake.auth.token`
- Organization-based rooms: `org:{orgId}`
- Users join rooms on organization view, leave when switching orgs

**Event Flow** (example - department creation):
1. Client calls REST API (`POST /api/organizations/:id/departments`)
2. Server creates department, logs audit trail
3. Server calls `emitToOrg(orgId, 'department:created', payload)` (see `server/src/services/socket-events.service.js`)
4. All connected clients in that org's room receive the event
5. Frontend updates UI without page refresh

**Frontend Integration**:
- `src/contexts/SocketContext.jsx` - React context for socket connection
- Automatically reconnects on disconnect
- Components subscribe to events via context

### CSRF Protection

**Mechanism**: Double-submit cookie pattern
- Server sends CSRF token in httpOnly cookie AND response body
- Client stores token, sends it back in `X-CSRF-Token` header
- Server validates token matches cookie

**Implementation**:
- Token fetched on app init (`src/api/client.js:52`)
- Auto-refreshed on 403 CSRF errors
- Applied to all state-changing requests (POST, PUT, DELETE)

### API Client Architecture

**Location**: `src/api/client.js`

**Key Features**:
- Centralized request function with automatic token refresh
- CSRF token management
- Request retry logic (401 → refresh → retry, 403 CSRF → refetch token → retry)
- Token refresh queue (prevents concurrent refresh requests)
- ApiError class with status codes

**Error Handling**:
- 401 Unauthorized: Attempts token refresh, retries request, falls back to login redirect
- 403 Forbidden (CSRF): Refetches CSRF token, retries once
- Other errors: Throws ApiError with status and message

### Frontend State Management

**Approach**: React Context API (no Redux/Zustand)

**Contexts** (`src/contexts/`):
- `AuthContext.jsx` - User authentication state, login/logout, role helpers
- `SocketContext.jsx` - WebSocket connection, event subscriptions

**Data Fetching**:
- Direct API calls in components (no global state cache)
- `useState` + `useEffect` pattern
- Real-time updates via Socket.IO events

### Service Layer (Backend)

**Pattern**: Service functions separated from route handlers

**Structure**:
- `server/src/routes/*.js` - Express routes (thin, handle HTTP concerns)
- `server/src/services/*.service.js` - Business logic (pure functions, return data/errors)
- Routes call services, services interact with database

**Example** (department creation):
- Route: `server/src/routes/departments.js` - validates request, checks auth
- Service: `server/src/services/department.service.js:createDepartment()` - inserts into DB
- Audit: `server/src/services/audit.service.js:logAction()` - records change
- Socket: `emitToOrg()` - notifies connected clients

### Component Organization (Frontend)

```
src/components/
├── admin/              # Organization management panels
│   ├── AuditLog.jsx          # Audit trail viewer
│   ├── DepartmentManager.jsx # Department CRUD with tree view
│   ├── PersonManager.jsx     # People CRUD with filtering
│   └── ShareSettings.jsx     # Public link & team members
├── auth/               # Authentication flows
│   ├── Login.jsx
│   ├── Signup.jsx
│   └── ChangePassword.jsx
├── superuser/          # System admin (superuser only)
│   ├── AdminDashboard.jsx    # System overview
│   ├── UserManagement.jsx    # User CRUD
│   └── SystemAuditLog.jsx    # Cross-org audit logs
├── ui/                 # Reusable UI components
│   ├── Button.jsx
│   ├── Modal.jsx
│   └── Toast.jsx
├── OrgMap.jsx          # Main org chart visualization (React Flow)
├── PublicOrgMap.jsx    # Public view of org chart (no auth)
├── SearchOverlay.jsx   # Full-text search with autocomplete
└── OrganizationSelector.jsx  # Org switcher dashboard
```

**Key Components**:
- **OrgMap.jsx**: Uses `reactflow` library for interactive canvas, handles zoom/pan, theming, export to PNG/PDF
- **DepartmentNode.jsx**: Custom React Flow node component with expand/collapse
- **SearchOverlay.jsx**: Connects to FTS5 search endpoint, fuzzy matching, autocomplete

### Import/Export

**CSV Format**:
- Exports separate files for departments and people (zipped)
- Includes all fields including IDs for re-import
- Handled in `server/src/routes/import.js`

**GEDS XML**:
- Government Electronic Directory Services format
- French character support (accents, special chars)
- Parser: `scripts/parse-geds-xml.js`
- Converts hierarchical XML to flat department/people structure

### Error Monitoring

**Technology**: Sentry (both frontend and backend)

**Setup**:
- Frontend: `src/sentry.js` - wraps app with ErrorBoundary, breadcrumbs for user actions
- Backend: `server/src/sentry.js` - captures exceptions, request data, user context
- Configured via `SENTRY_DSN` environment variable
- Production only (checks `NODE_ENV`)

### Security Features

**Implemented**:
- Helmet.js for security headers (XSS, clickjacking, MIME sniffing protection)
- CSRF protection (double-submit cookie)
- Rate limiting on auth endpoints (`express-rate-limit`)
- Bcrypt password hashing (cost factor 10)
- JWT token expiry (access: 15min, refresh: 7 days)
- Foreign key constraints prevent orphaned records
- Soft deletes preserve referential integrity
- Input validation on all endpoints

**Environment Variables**:
- `JWT_SECRET` - **REQUIRED**, app exits if missing or using default in production
- Production check: Refuses to start with `change-this-in-production` secret

## Important Patterns

### Adding a New Database Table

1. Add CREATE TABLE statement to `server/src/db.js` (before existing migrations)
2. Add migration logic to check/add columns (see existing migration pattern around line 76)
3. Create service file in `server/src/services/`
4. Create route file in `server/src/routes/`
5. Import and mount route in `server/src/index.js`

### Adding a New Real-Time Event

1. Emit from service after DB change: `emitToOrg(orgId, 'entity:action', payload)`
2. Add event type to `server/src/services/socket-events.service.js` (if complex)
3. Subscribe in frontend component via SocketContext: `socket.on('entity:action', handler)`
4. Update UI state in handler

### Running a Single Test

```bash
# Frontend
npm test -- <test-file-pattern>          # e.g., npm test -- Button.test

# Backend
cd server && npm test -- <test-file-pattern>
```

### Bulk Operations

**Pattern**: All bulk endpoints process items individually (not single query) to:
- Generate separate audit logs per item
- Provide granular success/failure reporting
- Maintain data integrity

**Example**: `bulkDeletePeople()` in `server/src/services/bulk.service.js`

### Audit Logging

**Automatic**: All CRUD operations must call `logAction()` from `audit.service.js`

**Required Parameters**:
- `organizationId` - Which org (for filtering/cleanup)
- `userId` - Who made the change
- `action` - 'created', 'updated', 'deleted'
- `entityType` - 'department', 'person', 'member', etc.
- `entityId` - ID of affected entity
- `snapshot` - Full JSON of entity state (for deleted items, preserves data)

## Development Tips

- **Frontend Port**: 3000 (Vite default), proxied to backend via Vite config
- **Backend Port**: 3001 (see `server/src/index.js:57`)
- **Database Inspection**: Use any SQLite browser, or `sqlite3 server/database.db`
- **Hot Reload**: Both frontend (Vite) and backend (`--watch` flag) support hot reload
- **Debugging Socket**: Use browser console → Network tab → WS filter
- **API Documentation**: Swagger UI available at `/api/docs` when server running
- **Pre-commit Hooks**: Husky runs linting and formatting via `lint-staged` (see `.husky/pre-commit`)

## Testing

- **Frontend**: Vitest + React Testing Library
- **Backend**: Vitest + Supertest (for API testing)
- Tests are colocated with source files (e.g., `auth.service.test.js` next to `auth.service.js`)
- Coverage configured in `vitest.config.js` (root) and `server/vitest.config.js`

## Production Deployment

**Platform**: Render (Web Service)

**Build Command**:
```bash
npm install && npm run build && cd server && npm install
```

**Start Command**:
```bash
cd server && npm start
```

**Environment**:
- `NODE_ENV=production`
- `JWT_SECRET` - Must be set to secure random string
- `DATABASE_URL` - Path to persistent disk (e.g., `file:/data/database.db`)
- `FRONTEND_URL` - For CORS (e.g., `https://orgtree.onrender.com`)
- Optional: `SENTRY_DSN`, `RESEND_API_KEY` (for email invitations)

**Persistent Storage**:
- Attach disk at `/data` for SQLite database
- Backup strategy: Automatic via cron (see `server/scripts/backup.js`)

## Key Files to Understand

- `server/src/db.js` - Database schema, migrations, FTS5 setup
- `server/src/index.js` - Express app setup, middleware order, route mounting
- `server/src/socket.js` - WebSocket initialization, room management
- `src/api/client.js` - API client, token refresh, CSRF handling
- `src/App.jsx` - Route definitions, AuthProvider, SocketProvider
- `server/src/middleware/auth.js` - JWT verification, role checking
- `server/src/services/member.service.js` - Organization permission checking
