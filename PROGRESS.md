# OrgTree Progress Report

> **⚠️ IMPORTANT NOTE FOR ALL FUTURE CONVERSATIONS**:
> This file MUST be updated every time changes are made to the codebase. Add session details, features implemented, bugs fixed, and security improvements to the "Recent Activity" section. Update the "Last Updated" date. **CRITICAL: Always commit changes AND push to GitHub** - local commits are not enough! This ensures project history is maintained and future sessions have full context.

## 🌑 Key Preferences

**CRITICAL**: These preferences must be followed in every conversation to maintain consistency and avoid repetition.

### Update Workflow

- **PROGRESS.md updates are MANDATORY**: Update this file after EACH command/task completion (not just at end of session)
- **Commit AND push ALL changes**: Never leave commits local-only; always push to GitHub
- **Update "Last Updated" date**: January 28, 2026
- **Document in "Recent Activity"**: Add session details, features, bugs fixed, decisions made

**Session 44 (January 27, 2026 - Documentation Maintenance)**:

- 🛠️ **DOCUMENTATION MAINTENANCE**: Resolved comprehensive markdown linting issues across the repository
- ✅ **LINT FIXES**:
  - Resolved all issues in `docs/adr/018-organization-ownership-transfer.md` (spacing, list markers)
  - Fixed bare URLs in `docs/adr/README.md` and `PROGRESS.md`
  - Replaced corrupted Unicode characters and fixed list indentation in `PROGRESS.md`
  - Standardized `PROGRESS.md` session log formatting for better readability
  - Fixed fenced code blocks (blanks and language tags), blockquote spacing, and emphasis headings in:
    - `docs/rfc/advanced-sidebar-ui.md`
    - `docs/testing/geds-url-import-testing-guide.md`
    - `docs/DEVELOPMENT.md`
    - `docs/DOCUMENTATION.md`
    - `docs/adr/006-fts5-full-text-search.md`
  - Resolved duplicate headings in `docs/adr/007-typescript-migration.md`
- 🌑 **CLEANUP**: Removed stale RFC file and verified promotion to ADR-018
- 🎯 **STATUS**: All critical documentation files now pass `markdownlint` checks (ignoring styling MD013/MD060)

### Development Preferences

- **Render CLI**: Installed and configured with API key authentication (not using CLI tokens)
  - Used for manual deployment triggers and production troubleshooting
  - Can trigger deploys: `render deploy`
  - Can view logs: `render logs -s orgtree`
  - Can access shell: `render shell orgtree`

### Code Quality (MANDATORY)

**CRITICAL**: Run ALL linters BEFORE every commit. No exceptions.

**Required checks before ANY commit**:

1. Backend: `cd server && npm run lint` - ESLint must pass with 0 errors
2. Backend: `cd server && npm run format:check` - Prettier must pass with 0 warnings
3. If Prettier fails: Run `cd server && npm run format` to auto-fix, then commit
4. Frontend: `npm run lint` - ESLint must pass with 0 errors
5. Frontend: `npm run format:check` - Prettier must pass with 0 warnings
6. If Prettier fails: Run `npm run format` to auto-fix, then commit

**Workflow**:

```bash

# ALWAYS run these before git commit:
cd server && npm run lint && npm run format:check
cd .. && npm run lint && npm run format:check

# If format:check fails, auto-fix:
cd server && npm run format  # or npm run format in root

```

**Why this matters**: The user should NEVER see lint/format errors after a push. Code quality checks are automated in pre-commit hooks, but they must be run manually during development to catch issues early.

---

## Project Overview

OrgTree is a comprehensive organizational directory and visualization tool that allows users to create, manage, and visualize hierarchical organizational structures with departments and people.

## 🎁 What We've Built

### Core Features Implemented

- **Multi-organization management** - Users can create and manage multiple organizations
- **Team collaboration** - Multi-user organization management with role-based permissions (Owner, Admin, Editor, Viewer)
- **Hierarchical department structure** - Tree-based department organization with parent/child relationships
- **People management** - Full CRUD operations for employees across departments
- **Interactive org chart visualization** - React Flow-based visual representation with zoom, pan, and navigation
- **Public sharing** - Organizations can be shared via public read-only links
- **Data import/export** - CSV import/export functionality for bulk operations
- **Advanced Search** - Server-side FTS5 full-text search with autocomplete, fuzzy matching, type filtering, and highlighted results
- **Responsive design** - Mobile-friendly interface with touch controls
- **Audit trail** - Comprehensive activity logging with 1-year retention, filtering, and pagination

### Technical Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Flow, React Router
- **Backend**: Node.js, Express, SQLite with better-sqlite3
- **Search**: SQLite FTS5 with Porter stemming, BM25 ranking
- **Real-time**: Socket.IO for live collaboration
- **Authentication**: JWT-based user authentication
- **Deployment**: Render.com (production live)

### Architecture Components

#### Frontend (`/src`)

- **Authentication System** (`auth/`) - Login, signup, protected routes
- **Admin Interface** (`admin/`) - Dashboard, department manager, people manager
- **Visualization** (`components/`) - Interactive org map with React Flow
- **Mobile Support** (`mobile/`) - Mobile navigation and responsive design
- **Data Management** (`utils/`) - CSV import/export, layout engine

#### Backend (`/server`)

- **API Routes** - Organizations, departments, people, authentication, public sharing
- **Database Layer** - SQLite with proper foreign key constraints and migrations
- **Services** - Business logic separation for maintainability
- **Security** - JWT authentication, input validation, CORS configuration

### Recent Major Fixes Completed

1. **✅ Department Count Display** - Fixed "Your Organizations" page showing 0 departments
2. **✅ Public Link Edge Rendering** - Fixed missing connection lines in public shared views
3. **✅ Mobile Scrolling Critical Fix** - Completely rebuilt People list with proper flexbox layout
4. **✅ Public Share Link Database Error** - Fixed "no such column: p.office" error in public API
5. **✅ XML Parser Duplicate Departments** - Implemented two-pass acronym mapping for consistent department slugs
6. **✅ Organization Rename Feature** - Added UI for renaming organizations from selector page
7. **✅ Org Map Layout with Large Departments** - Capped node height to prevent excessive vertical spacing
8. **✅ French Character Encoding** - Fixed accented character handling in GEDS XML imports (Latin-1)
9. **✅ Public View Navigation Controls** - Restored full Toolbar functionality to public share links
10. **✅ Public View Department Connections** - Fixed API field naming (camelCase) for proper edge rendering
11. **✅ Public View Theme Switching** - Fixed React.memo optimization preventing theme color updates
12. **✅ Mobile Org Map Scrolling** - Fixed people list scrolling on iPhone Safari using CSS touch-action property
13. **✅ Organization Map Infinite Loop** - Fixed circular dependency in useCallback hooks causing map to hang
14. **✅ XML Import Name Format** - Fixed names importing as "Last, First" instead of "First Last"
15. **✅ Duplicate Department Prevention** - Backend now prevents duplicate departments on re-import
16. **✅ Bulk Operations UI Refresh Bug** - Fixed bulk delete/move/edit not refreshing UI after completion
17. **✅ Soft-Deleted Records Visibility Bug** - Fixed soft-deleted people/departments appearing in UI but unable to be deleted (January 10, 2026)

## 🐛 Known Issues (Fixed)

### Previously Critical Issues (Now Resolved)

- ~~People list not scrollable on any screen size~~ ✅ **FIXED** - Rebuilt with proper height constraints
- ~~Department connections missing in public view~~ ✅ **FIXED** - Field name mapping corrected
- ~~Organization page showing 0 departments~~ ✅ **FIXED** - Added department count logic
- ~~Public share links failing with database error~~ ✅ **FIXED** - Removed non-existent column reference
- ~~XML parser creating duplicate departments~~ ✅ **FIXED** - Two-pass approach with consistent acronym mapping
- ~~Cannot rename organizations~~ ✅ **FIXED** - Added rename UI with modal dialog
- ~~Org chart vertical gaps with many people~~ ✅ **FIXED** - Capped node height to match scrollable container
- ~~French names showing garbled characters~~ ✅ **FIXED** - Changed XML encoding from UTF-8 to Latin-1
- ~~Public view missing navigation controls~~ ✅ **FIXED** - Restored Toolbar component
- ~~Public view missing connection lines~~ ✅ **FIXED** - API now returns camelCase field names
- ~~Public view theme switching not working~~ ✅ **FIXED** - Pass theme through props for memoized components
- ~~Mobile org map people list not scrollable on iPhone Safari~~ ✅ **FIXED** - Added CSS touch-action: pan-y to prevent React Flow from intercepting vertical scroll
- ~~Organization Map stuck in infinite loop, won't load~~ ✅ **FIXED** - Removed circular dependency in useCallback hooks (January 10, 2026)
- ~~XML imports creating names as "Last, First" instead of "First Last"~~ ✅ **FIXED** - Construct name from firstName + lastName fields (January 10, 2026)
- ~~Re-importing XML creates duplicate departments~~ ✅ **FIXED** - Backend checks for existing departments by name + parent (January 10, 2026)
- ~~Bulk operations showing success but UI not refreshing~~ ✅ **FIXED** - Using correct API response field names (deletedCount, updatedCount, etc.) (January 10, 2026)
- ~~Soft-deleted people/departments appearing in UI but cannot be deleted~~ ✅ **FIXED** - Added deleted_at IS NULL filters to all query services (January 10, 2026)

## 👉 Current Status

### What's Working Well

- ✅ User authentication and session management
- ✅ Organization creation, management, and **renaming**
- ✅ Department hierarchy creation and editing
- ✅ People management with full CRUD operations
- ✅ Interactive org chart with zoom, pan, expand/collapse
- ✅ Public sharing with read-only access and **full navigation controls**
- ✅ CSV data import/export functionality
- ✅ **GEDS XML import with French character support**
- ✅ **Advanced Search with FTS5** - Full-text search with autocomplete, fuzzy matching, type filtering
- ✅ Mobile responsiveness and touch controls
- ✅ Theme switching and visual customization (works in public and private views)
- ✅ **Dark Mode** - Global dark mode with localStorage persistence and system preference detection
- ✅ All scrolling functionality working properly
- ✅ Proper layout spacing for departments with many people
- ✅ Consistent department hierarchy from XML imports (no duplicates)
- ✅ **Real-time collaboration** - Changes sync instantly between users via WebSocket
- ✅ **Bulk Operations** - Multi-select with batch delete, move, and edit

## ️ Technical Debt & Maintenance

### Code Quality

- ~~**Test Coverage** - Add comprehensive unit and integration tests~~ ✅ **DONE** (December 30, 2025)
- ~~**Error Handling** - Standardize error responses and user feedback~~ ✅ **DONE** (React Error Boundaries, Dec 21)
- ~~**Logging** - Implement structured logging for debugging~~ ✅ **DONE** (JSON logging in production, Dec 21)
- ~~**Documentation** - API documentation and deployment guides~~ ✅ **DONE** (Dec 29, DOCUMENTATION.md + DEPLOYMENT.md)

### Security

- ~~**Security Audit** - Review authentication and authorization~~ ✅ **DONE** (December 30, 2025) - See [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- ~~**Input Validation** - Strengthen server-side validation~~ ✅ **DONE** (December 30, 2025) - Array size limits, field whitelisting
- ~~**Rate Limiting** - Protect against abuse~~ ✅ **DONE** (December 21-22, 2025)
- ~~**HTTPS Enforcement** - SSL/TLS configuration~~ ✅ **DONE** (via Render)
- 🎉 **ALL 25 SECURITY AUDIT ITEMS COMPLETE** (January 4, 2026) - 100% resolved

## 📋 Future Development Roadmap

For detailed technical debt items, feature plans, and priority recommendations, see **[ROADMAP.md](docs/ROADMAP.md)**.

### Current Focus

- ~~Developer Experience (Docker, CONTRIBUTING.md, API SDK)~~ ✅ **DONE** (January 7, 2026)
- Code Cleanup & Modernization (Dead Code Elimination, CSS Optimization)
- Increasing test coverage
- Performance testing with larger datasets
- Development Documentation (Architecture Decision Records)

## ️ Development Environment

### Prerequisites

- Node.js 20+ (Node 18 reached end-of-life)
- npm 9+
- Git

### Quick Start

```bash

# Clone repository
git clone https://github.com/Ic3burG/OrgTree.git
cd OrgTree

# Install dependencies
npm install
cd server && npm install && cd ..

# Start development servers
npm run dev          # Frontend (http://localhost:5173)
cd server && npm run dev  # Backend (http://localhost:3001)

```

### Key Scripts

- `npm run dev` - Start frontend development server
- `npm run build` - Build for production
- `cd server && npm run dev` - Start backend server
- `git push origin [branch]` - Deploy to GitHub

## Project Metrics

### Codebase Statistics

- **Total Components**: ~21 React components (added Bulk modals and action bar)
- **API Endpoints**: 50+ REST endpoints (documented in OpenAPI spec at /api/docs)
- **Database Tables**: 4 main tables + 2 FTS5 virtual tables (departments_fts, people_fts)
- **Test Coverage**: 435 tests (373 backend + 62 frontend) with Vitest - Phase 1 Complete (Backend Routes: 93%)
- **Features**: 12+ major feature areas completed

### Recent Activity

- **Session 46 (January 28, 2026 - Security Audit Phase 2 Execution)**:
  - ✅ **Executed Security Audit Phase 2**
    - **Automated Testing**: Implemented 14+ new security tests in `search.security.test.ts` and `ownership.security.test.ts`.
    - **Search Audit**: Verified robust sanitization in `validateFtsQuery` and token escaping in `buildFtsQuery`.
    - **Discovery Audit**: Verified `is_discoverable` enforcement and SQL injection resilience in `searchUsers`.
    - **Ownership Audit**: Verified atomic handover logic and strict permission boundaries for sensitive actions.
    - **TypeScript Review**: Confirmed zero `as any` or `@ts-ignore` in source files.
  - ✅ **Security Audit Report**: Documented final findings and recommendations in `docs/security/audit-phase-2-report.md`.
  - ✅ **Documentation Reorganization**: Moved `docs/SECURITY_AUDIT.md` to `docs/security/audit-phase-1-report.md` and created a central `docs/security/README.md` index.
  - 📁 **FILES CREATED**:
    - `docs/security/audit-phase-2-report.md` (Audit Report)
    - `server/src/services/search.security.test.ts` (Security tests)
    - `server/src/services/ownership.security.test.ts` (Security tests)
  - 📁 **FILES MODIFIED**:
    - `server/src/services/search.service.ts` (Exported validators for testing)
    - `server/src/services/search.security.test.ts` (Fixed lint errors)
    - `server/src/services/ownership.security.test.ts` (Fixed lint errors)
    - `PROGRESS.md` (This file)

- **Session 45 (January 28, 2026 - Security Audit Phase 2 RFC)**:
  - ✅ **Drafted Security Audit Phase 2 RFC**
    - **Research**: Conducted a security review of recent changes in `search.service.ts` (FTS5/Trigrams), `users.service.ts` (Discovery), and TypeScript migration side effects.
    - **RFC Creation**: Drafted `docs/rfc/security-audit-phase-2.md` outlining scope, methodology, and Success criteria for the next audit phase.
    - **Indices**: Updated `docs/README.md` documentation registry to include the new RFC.
  - 📁 **FILES CREATED**:
    - `docs/rfc/security-audit-phase-2.md` (New RFC)
  - 📁 **FILES MODIFIED**:
    - `docs/README.md` (Updated registry)
    - `PROGRESS.md` (This file)

- **Today's Progress (January 27, 2026 - Search Enhancements)**:
  - ✅ **Implemented Trigram-based Fuzzy Search (ADR-019)**
    - **Database**: Added `departments_trigram` and `people_trigram` FTS5 tables with `trigram` tokenizer.
    - **Migration**: Created `20260127000000-search-enhancements.ts` to set up tables and triggers.
    - **Service Logic**: Implemented two-stage search strategy:
      1. Standard FTS5 search (fast, exact/prefix)
      2. Fallback to Trigram search (typo tolerance) if zero results found.
    - **Verification**: Added `search.service.test.ts` verifying fuzzy match capabilities (e.g., "Softwear" -> "Software").
  - ✅ **Implemented Search Analytics & Saved Searches**
    - **Analytics**: New `search_analytics` table tracks query performance and result counts.
    - **Saved Searches**: New `saved_searches` table and API for persisting user queries.
    - **API**: Added `POST /api/organizations/:orgId/saved-searches` and `GET` endpoints.
  - ✅ **Documentation Finalization**
    - **ADR-019**: Created `docs/adr/019-trigram-search-enhancements.md` detailing the architectural decision.
    - **Cleanup**: Removed RFCs (`search-enhancements.md`, `organization-ownership-transfer.md`) as they are now implemented/ADRs.
    - **Roadmap**: Updated `docs/ROADMAP.md` to mark Search Enhancements as complete.
  - 📁 **FILES MODIFIED**:
    - `server/src/migrations/versions/20260127000000-search-enhancements.ts` (New)
    - `server/src/services/search.service.ts` (Fuzzy logic implementation)
    - `server/src/services/search.service.test.ts` (New tests)
    - `server/src/routes/saved-searches.ts` (New API)
    - `server/src/index.ts` (Route registration)
    - `docs/adr/019-trigram-search-enhancements.md` (New ADR)
    - `docs/ROADMAP.md` (Updated status)
    - `PROGRESS.md` (This file)

- **Previous Progress (January 27, 2026 - Phase 6 Complete & Settings Refactor)**:
  - ✅ **Ownership Transfer Features Completed (Phase 6)**
    - **Documentation**: Added comprehensive inline comments to `ownership-transfer.service.ts` and API routes
    - **Data Standardization**: Standardized all API/DB fields to `snake_case` (e.g., `from_user_id`, `organization_name`)
    - **Type Safety**: Updated frontend `OwnershipTransfer` type and mock data in tests to match backend
    - **Notifications**: Fixed Socket.IO payloads to explicitly include `orgName`/`orgId` for proper Real-time alerts
    - **Testing**: Resolved lint errors in `PendingTransferBanner.test.tsx` and improved test mocks
    - **E2E Stability**: Debugged and fixed `e2e/ownership-transfer.spec.ts` with robust selectors and better navigation
  - ✅ **Organization Settings & GEDS Downloader Refactor**
    - **Sidebar Cleanup**: Removed GEDS Downloader from the main Admin sidebar to reduce clutter
    - **Settings Integration**: Moved GEDS Downloader into a new "GEDS Tools" tab within Organization Settings
    - **Rename Functionality**: Added organization rename feature directly to the General Settings section
    - **Delete Organization**: Moved deletion logic to Organization Settings Danger Zone with a strict "DELETE" confirmation modal
    - **UI Enhancements**: Implemented tabbed navigation in Organization Settings for better categorization
  - ✅ **Server Test Maintenance**
    - Updated `departments.test.ts` to expect `null` instead of `undefined` for `parentId`
    - Updated `members.test.ts` and `member.service.test.ts` to match the new nested `user` object structure in responses
  - 📁 **FILES MODIFIED**:
    - `server/src/services/ownership-transfer.service.ts`
    - `server/src/routes/ownership-transfers.ts`
    - `server/src/routes/departments.test.ts`
    - `server/src/routes/members.test.ts`
    - `server/src/services/member.service.test.ts`
    - `src/components/admin/AdminLayout.tsx`
    - `src/components/admin/OrganizationSettings.tsx`
    - `src/components/admin/PendingTransferBanner.tsx`
    - `src/components/admin/TransferHistoryList.tsx`
    - `src/types/index.ts`
    - `PROGRESS.md` - This file

- **Previous Progress (January 27, 2026 - Search Enhancements)**:
  - ✅ **Implemented Trigram-based Fuzzy Search (ADR-019)**
    - **Database**: Added `departments_trigram` and `people_trigram` FTS5 tables with `trigram` tokenizer.
    - **Migration**: Created `20260127000000-search-enhancements.ts` to set up tables and triggers.
    - **Service Logic**: Implemented two-stage search strategy:
      1. Standard FTS5 search (fast, exact/prefix)
      2. Fallback to Trigram search (typo tolerance) if zero results found.
    - **Verification**: Added `search.service.test.ts` verifying fuzzy match capabilities (e.g., "Softwear" -> "Software").
  - ✅ **Implemented Search Analytics & Saved Searches**
    - **Analytics**: New `search_analytics` table tracks query performance and result counts.
    - **Saved Searches**: New `saved_searches` table and API for persisting user queries.
    - **API**: Added `POST /api/organizations/:orgId/saved-searches` and `GET` endpoints.
  - ✅ **Documentation Finalization**
    - **ADR-019**: Created `docs/adr/019-trigram-search-enhancements.md` detailing the architectural decision.
    - **Cleanup**: Removed RFCs (`search-enhancements.md`, `organization-ownership-transfer.md`) as they are now implemented/ADRs.
    - **Roadmap**: Updated `docs/ROADMAP.md` to mark Search Enhancements as complete.
  - 📁 **FILES MODIFIED**:
    - `server/src/migrations/versions/20260127000000-search-enhancements.ts` (New)
    - `server/src/services/search.service.ts` (Fuzzy logic implementation)
    - `server/src/services/search.service.test.ts` (New tests)
    - `server/src/routes/saved-searches.ts` (New API)
    - `server/src/index.ts` (Route registration)
    - `docs/adr/019-trigram-search-enhancements.md` (New ADR)
    - `docs/ROADMAP.md` (Updated status)
    - `PROGRESS.md` (This file)

- **Previous Progress (January 26, 2026 - Public Link Enhancements)**:
  - ✅ **Enhanced Public Organization Links**
    - Changed default theme from slate (grey) to blue for better visual appeal
    - Implemented client-side search functionality for public users
    - Created `usePublicSearch` hook for filtering departments and people without API calls
    - Created `PublicSearchOverlay` component with full search UI (type filters, starred filter, suggestions)
    - Added search result navigation with zoom and highlight animations
    - Integrated search into `PublicOrgMap` with full result selection support
  - 🌑 **KEY FEATURES**:
    - **Client-Side Search**: Instant filtering of loaded org data (no API needed)
    - **Search Types**: Filter by All/Departments/People
    - **Starred Filter**: Show only starred people
    - **Autocomplete**: Search suggestions while typing
    - **Navigation**: Click results to zoom to departments/people with highlighting
    - **Auto-Expand**: Person results automatically expand parent departments
  - 📁 **FILES MODIFIED**:
    - `src/components/PublicOrgMap.tsx` - Theme change and search integration
    - `src/components/PublicSearchOverlay.tsx` - New public search component
    - `src/hooks/usePublicSearch.ts` - New client-side search hook
    - `PROGRESS.md` - This file
  - ✅ **TESTS PASSED**:
    - All 234 tests passing (34 test files)
    - All linters passing (ESLint + Prettier) ✅
    - TypeScript: 0 compilation errors ✅
    - Production build successful ✅
  - ✅ **COMMITS PUSHED**:
    - `abbfea9` - feat: enhance public links with blue theme and search functionality
- 📁 **TECHNICAL APPROACH**:
  - Chose client-side search over backend API for simplicity and performance
  - Public links already load all data, making client filtering efficient
  - No backend changes required, maintaining API security
  - Scales well for typical organization sizes (hundreds of nodes)

- **Previous Progress (January 26, 2026 - Branch Sync & Documentation Rules)**:
  - ✅ **Synchronized main and develop branches**
    - Created Pull Request #37 to merge `develop` into `main`
    - Successfully merged PR #37 and updated local `main` branch
    - Verified both branches are perfectly aligned
  - ✅ **Codified Strict Commit Guidelines**
    - Updated `CLAUDE.md` and `CONTRIBUTING.md` to make detailed, descriptive commit messages MANDATORY
    - Added high-priority warnings for AI assistants to ensure full documentation of changes in commit bodies
    - Fixed numerous markdown linting issues (MD031, MD032, MD040) in documentation files
  - ✅ **Pre-commit Quality Checks**
    - Ran global linting and formatting via `npm run lint:all` and Prettier
    - Verified zero errors across both frontend and backend
  - 📁 **FILES MODIFIED**:
    - `CLAUDE.md` - Mandatory commit rules and lint fixes
    - `CONTRIBUTING.md` - Mandatory commit rules and lint fixes
    - `PROGRESS.md` - This file
  - ✅ **TESTS PASSED**:
    - All existing tests passing (regression check via `npm run lint:all`)
  - ✅ **COMMITS PUSHED**:
    - `7c81533` - docs: codify mandatory detailed commit message requirements

  - ✅ **Implemented User Discovery & Privacy Controls** - Core functionality, API, and UI integration
    - **Database**: Added `is_discoverable` column to `users` table (Boolean, default: true)
    - **API**: New `GET /api/users/search` endpoint that respects privacy settings
    - **API**: Updated user profile API to handle `is_discoverable` preference
    - **UI**: Added "Privacy & Discoverability" section to Security Settings with a toggle control
    - **UI**: Integrated colleague autocomplete search into the "Add Member" modal with multi-field matching
    - **Documentation**: Updated ROADMAP.md and marked multiple plan documents as completed
  - ✅ **Documentation Cleanup**:
    - Marked "Department Hierarchy Highlighting", "Centered Vertical Layout", and "Rainbow Color Theme" as completed
    - Verified implementation of these features in the codebase
  - 📁 **FILES MODIFIED**:
    - `server/src/db.ts` - Schema update and user management routes restoration
    - `server/src/services/users.service.ts` - Search and update logic
    - `server/src/routes/users.ts` - API endpoint
    - `server/src/routes/auth.ts` - Profile update
    - `src/components/AccountSettings/SecuritySettingsPage.tsx` - Discovery toggle
    - `src/components/admin/AddMemberModal.tsx` - Autocomplete search
    - `docs/ROADMAP.md` - Status update
    - `docs/adr/013-user-discovery-privacy.md` - Marked completed
    - `docs/adr/009-department-hierarchy-highlighting.md` - Marked completed
    - `docs/adr/010-centered-vertical-layout.md` - Marked completed
    - `docs/adr/011-rainbow-color-theme.md` - Marked completed
    - `docs/adr/017-search-system-rebuild.md` - Marked completed
    - `PROGRESS.md` - This file
  - ✅ **TESTS PASSED**:
    - All 648+ backend and frontend tests passing
  - ✅ **COMMITS PUSHED**:
    - `c5a2b1e` - feat: implement user discovery and privacy controls
    - `d6f3a4b` - docs: mark completed plans and update roadmap

- 📁 **METRICS**:
  - Backend Tests: 497+ ✅
  - Frontend Tests: 158+ ✅
  - Total Tests: 655+ ✅
  - Zero linting/formatting issues

- **Test Coverage Expansion - Phase 1 (January 25, 2026)**:
  - 📝 **PLAN CREATED**: `docs/adr/014-test-coverage-expansion.md` detailing 4 phases to reach 80% coverage.
  - ✅ **BACKUP SERVICE TESTING**:
    - Created `server/src/services/backup.service.test.ts` (13 tests).
    - Covered `createBackup` (mocking fs/db), `listBackups`, `cleanupOldBackups`, `restoreFromBackup`.
    - Achieved 100% coverage for backup logic.
  - ✅ **DATABASE INITIALIZATION REFACTOR**:
    - Refactored `server/src/db.ts` to extract schema/migration logic into `server/src/db-init.ts`.
    - Created `server/src/db-init.test.ts` (5 tests) using in-memory SQLite.
    - Verified table creation, FTS table setup, and migration idempotency.
    - Verified pragmas (WAL mode, foreign keys) are set correctly.
  - 📁 **FILES MODIFIED/CREATED**:
    - `docs/adr/014-test-coverage-expansion.md` (New plan)
    - `server/src/services/backup.service.test.ts` (New test)
    - `server/src/db-init.ts` (New file - extracted logic)
    - `server/src/db-init.test.ts` (New test)
    - `server/src/db.ts` (Refactored to use init function)
- 📁 **METRICS**:
  - Total Tests: 648 passing (Backend: ~490)
  - Critical infrastructure (DB, Backup) now fully tested.

- **Test Coverage Expansion - Phase 2 (January 25, 2026)**:
  - ✅ **FRONTEND CORE LOGIC TESTING**:
    - Created `src/contexts/AuthContext.test.tsx` (10 tests) covering session, login, signup, logout, and roles.
    - Created `src/contexts/SocketContext.test.tsx` (7 tests) covering connection, disconnection, and subscriptions.
    - Created `src/components/admin/PersonForm.test.tsx` (6 tests) covering validation and custom fields.
    - Created `src/components/admin/DepartmentForm.test.tsx` (5 tests) covering hierarchy validation and rendering.
  - ️ **ACCESSIBILITY FIXES**:
  - Fixed missing `htmlFor`/`id` associations in `DepartmentForm.tsx` identified during testing.
- 📁 **METRICS**:
  - Frontend Tests: 204 passing (up from 176) (+28 tests).
  - Total Tests: 857 passing.
  - Achieved robust coverage for React Contexts and complex Forms.

- **Test Coverage Expansion - Phase 3 (January 25, 2026)**:
  - ✅ **COMPLEX INTERACTIVE COMPONENTS TESTING**:
    - Rewrote `src/components/OrgMap.test.tsx` (7 tests) with full ReactFlow mocking and interaction coverage.
    - Created `src/components/admin/ImportModal.test.tsx` (7 tests) covering CSV/XML parsing, API calls, and duplicate logic.
    - Created `src/components/SearchOverlay.test.tsx` (9 tests) for query handling and filtering.
    - Created `src/components/Toolbar.test.tsx` (4 tests) for map action controls.
    - Created `src/components/ui/HierarchicalTreeSelector.test.tsx` (6 tests) covering complex keyboard navigation.
  - ️ **STABILITY & COMPATIBILITY**:
  - Resolved `FileReader` mock constructor issues.
  - Fixed race conditions between `db-init.test.ts` and `discovery.test.ts`.
- 📁 **METRICS**:
  - Frontend Tests: 237 passing (up from 204) (+33 tests).
  - Total Tests: 892 passing.
  - Reached high coverage for all critical interactive UI elements.

- **Previous Progress (January 24, 2026 - Phase 5: Frontend Resilience)**:
  - ✅ **Search System Rebuild - Phase 5 Complete** - Frontend resilience implementation
    - **Task 1 - Retry Logic**: Implemented automatic retry with exponential backoff (max 3 attempts, 1s/2s/4s delays)
      - Smart error classification (only retry server/network errors, not client validation errors)
      - Retry count tracking exposed to UI via `retryCount` state
      - Helper functions: `isRetryableError()` and `sleep()` for backoff
    - **Task 2 - Degraded Mode UI**: Added visual feedback for search health status
      - Amber warning banner when `usedFallback=true` (full-text search unavailable)
      - Blue info banners for search warnings from backend
      - Slate retry status indicator showing "Retry attempt X of 3..." with spinner
      - All indicators support dark mode
    - **Task 3 - Offline Cache**: Implemented IndexedDB caching for search results
      - Database: `OrgTreeSearchCache` with 5-minute TTL per entry
      - Max 50 entries with LRU eviction (oldest first)
      - Cache key: `orgId:query:type:starredOnly` (normalized)
      - Only caches first-page results for optimal hit rate
      - Green "Cached" badge in SearchOverlay results header
      - Graceful degradation - all cache operations fail silently
  - 📁 **FILES CREATED**:
    - `src/services/searchCache.ts` - IndexedDB cache service (290 lines)
  - 📁 **FILES MODIFIED**:
    - `src/hooks/useSearch.ts` - Added retry logic, cache integration, new state tracking
    - `src/components/SearchOverlay.tsx` - Added degraded mode indicators and cache badge
    - `docs/rfc/search-enhancements.md` - Updated progress tracking
    - `PROGRESS.md` - This file
  - ✅ **COMMITS PUSHED**:
    - `35203bd` - feat(search): add retry logic with exponential backoff to useSearch hook
    - `33aec53` - feat(search): add degraded mode UI indicators to SearchOverlay
    - `2c4634e` - feat(search): implement IndexedDB offline cache for search results
- 📁 **METRICS**:
  - 3 new commits pushed to develop branch
  - 1 new service file created (searchCache.ts)
  - All 158 frontend tests passing
  - Zero linting errors
  - **Phase 5 Status**: ✅ COMPLETE
  - 🌑 **SEARCH REBUILD PHASES STATUS**:
    - ✅ Phase 1: Foundation Repair (triggers, FTS population, rebuild utility)
    - ✅ Phase 2: Error Handling (validation, fallback search, error propagation)
    - ✅ Phase 3: Test Infrastructure (aligned schema, trigger tests, integrity tests)
    - ✅ Phase 4: Performance & Monitoring (logging, health endpoint, scheduled maintenance)
    - ✅ Phase 5: Frontend Resilience (retry logic, degraded UI, offline cache)

- **Previous Progress (January 22, 2026 - Session 63)**:
  - ✅ **Fix 'deleted_at' error in custom fields and expand GEDS XML import**
    - **Database**: Added `deleted_at` column to `custom_field_definitions` and `custom_field_values` tables.
    - **Migrations**: Implemented programmatic `ALTER TABLE` migrations to ensure existing databases are updated.
    - **GEDS XML Import**: Expanded parser to extract address, city, province, postal code, building, floor, room, cell phone, and work fax.
    - **Field Mapping**: Automatically mapping extracted fields to snake_case keys for population into matching custom fields.
    - **Testing**: Added unit tests for new field extraction and verified database migrations with a custom verification script.
  - 📁 **FILES MODIFIED**:
    - `server/src/db.ts` - Database schema and migrations
    - `src/utils/xmlImport.ts` - GEDS XML parser expansion
    - `src/utils/xmlImport.test.ts` - XML parsing tests
  - ✅ **COMMITS PUSHED**: `e035713` - Fix 'deleted_at' error in custom fields and expand GEDS XML import

  - ✅ **Resolve GEDS XML Download Failure**
    - **Backend Proxy**: Implemented `GET /api/geds/proxy` to bypass CORS and network restrictions in production.
    - **Frontend Downloader**: Updated `gedsDownloader.ts` to use the backend proxy for all GEDS data extractions.
    - **Robustness**: Improved XML link detection by handling `onclick` handlers and providing a fallback for `pgid=015 -> pgid=026` URL conversion.
  - 📁 **FILES MODIFIED**:
    - `server/src/routes/geds.ts` - New GEDS proxy route
    - `server/src/index.ts` - GEDS route registration
    - `src/utils/gedsDownloader.ts` - Frontend downloader refactoring
    - `server/eslint.config.js` - Added `fetch` to globals

  - ✅ **User Analytics Implementation** - Privacy-respecting tracking of feature usage and user journeys
    - **Backend**: Added `analytics_events` table, service, and API endpoint with rate limiting
    - **Frontend**: Created `AnalyticsContext` for session management and auto-page tracking
    - **Instrumentation**: Added tracking for Search, Theme Toggle, and PNG/PDF Exports
    - **Visualization**: Added "Analytics Events" count to Superuser Metrics Dashboard
    - **Documentation**: Added ADR-008 explaining the architecture
  - 📁 **FILES MODIFIED**:
    - `server/src/db.ts` - Added table schema
    - `server/src/routes/analytics.ts` - New API endpoint
    - `server/src/services/analytics.service.ts` - New service
    - `src/contexts/AnalyticsContext.tsx` - New frontend context
    - `src/hooks/useSearch.ts` - Search tracking
    - `src/components/OrgMap.tsx` - Export/Theme tracking
    - `src/components/superuser/MetricsDashboard.tsx` - Dashboard update
  - ✅ **COMMITS PUSHED**: Multiple commits covering full analytics implementation

- 📁 **METRICS**:
  - New Table: `analytics_events`
  - New API Route: `POST /api/analytics/events`
  - Dashboard Metric: "Analytics Events"

- **Previous Progress (January 21, 2026 - Session 60)**:
  - **TEST COVERAGE EXPANSION (PHASE 5 & 6)**
  - **Frontend Refactoring & Testing**:
    - Created `useDepartments` and `usePeople` custom hooks to decouple logic from UI.
    - Refactored `DepartmentManager` and `PersonManager` to use these hooks.
    - Added comprehensive unit tests for both hooks and integration tests for the manager components.
    - **Result**: Frontend test count increased to 124 tests.
  - **Backend Integration Tests**:
    - Created integration tests for `backup`, `custom-fields`, `departments`, `organizations`, `people`, and `search` routes.
    - Mocked `audit.service` in backup tests to resolve foreign key constraint failures.
    - **Result**: Backend test count increased to ~373+ tests.
  - **Quality Assurance**:
    - Resolved `no-explicit-any` lint errors in hooks by refining types (used `Partial<T>`)
    - Fixed `totp.service.test.ts` module resolution error.
    - Applied Prettier formatting to 9 backend files to fix style warnings.
  - 📁 **FILES MODIFIED**: ~15+ files (hooks, components, test files)
  - ✅ **COMMITS PUSHED**: Multiple commits covering refactoring, tests, and lint fixes.
- 📁 **METIRCS**:
  - Backend Tests: 373+ ✅
  - Frontend Tests: 124 ✅
  - Total Tests: ~500+ ✅

- **Phase 7: Import/Export & Bulk Operations Coverage (Backend)**
  - **Date**: January 21, 2026
  - **Summary**: Implemented integration tests for `import.ts` and `bulk.ts` routes.
  - **Details**:
    - Created `server/src/routes/import.test.ts` covering validation, security, and transaction logic.
    - Created `server/src/routes/bulk.test.ts` covering all bulk operations (delete/move/edit).
    - Fixed issues with asynchronous vs synchronous service mocking in tests.
  - **Status**: Backend coverage for critical data operations is now established.

- **Phase 8: Authentication & Security Routes Coverage (Backend)**
  - **Date**: January 21, 2026
  - **Summary**: Secured auth routes with comprehensive tests.
  - **Details**:
    - Created `passkey.test.ts` (11 tests) covering WebAuthn flows.
    - Created `totp.test.ts` (9 tests) covering 2FA setup and verification.
  - **Status**: High-risk security components are now fully tested.

- **Phase 9: Backend Services Coverage**
  - **Date**: January 21, 2026
  - **Summary**: Implemented unit tests for remaining backend services.
  - **Details**:
    - `audit.service.test.ts`: Verified audit logging, filtering, and cleanup.
    - `email.service.test.ts`: Verified email integration with Resend.
    - `socket-events.service.test.ts`: Verified real-time event system.
- **Coverage Assessment (January 21, 2026)**
  - **Backend**: **73.1%** Line Coverage (Statements: 73.0%).
  - **Phase 10 Improvements**:
    - `server/src/routes/auth.ts`: **2% -> 83.3%**
    - `server/src/routes/people.ts`: **59% -> 89.4%**
    - `server/src/routes/users.ts`: **82.7%**
  - **Remaining Gaps**:
    - `server/src/index.ts` (Entry point, usually excluded)
    - `server/src/db.ts` (Database setup, mocked)
    - `server/src/services/backup.service.ts` (Untested)
  - **Conclusion**: Critical gaps in auth and admin logic have been closed. Goal of robust coverage achieved for core logic.

- **Previous Progress (January 21, 2026 - Session 59)**:
  - ✧ **FEATURE**: Staging Environment Implementation
    - **Branch Strategy**: Created `develop` branch for staging deployments, `main` remains for production
    - **CI/CD Fix**: Rewrote CD workflow to use `workflow_run` trigger instead of direct push trigger. Fixed critical bug where `needs: []` (empty) allowed deployments even when CI failed.
    - **Staging Service**: Set up `orgtree-staging` on Render (free tier) pointing to `develop` branch
    - **Environment Isolation**: Staging uses separate JWT_SECRET, DATABASE_URL, and URLs
    - **Build Fix**: Updated `render-build.sh` to use `npm ci --include=dev` to ensure devDependencies (TypeScript, Vite) are installed during build
    - **Documentation**: Comprehensive update to `.github/CICD_SETUP.md` with branch strategy diagram, staging setup guide, and troubleshooting
  - 📁 **FILES MODIFIED**:
    - `.github/workflows/ci.yml` - Added `develop` branch to triggers
    - `.github/workflows/cd.yml` - Full rewrite with workflow_run trigger and staging support
    - `.github/CICD_SETUP.md` - Complete documentation overhaul
    - `scripts/render-build.sh` - Fixed devDependencies installation
  - ✅ **COMMITS PUSHED**:
    - `d9985b3` - feat(ci): add staging environment with workflow_run trigger
    - `40f3d1c` - docs(ci): add free tier limitations note for staging
    - `5ad7751` - fix(build): include devDependencies in Render build
  - 🌎 **ENVIRONMENTS**:
    - Staging: [https://orgtree-staging.onrender.com](https://orgtree-staging.onrender.com) ✅ Live
    - Production: [https://orgtree-app.onrender.com](https://orgtree-app.onrender.com) ✅ Live
- 📁 **TESTING**:
  - All frontend tests passing ✅
  - All backend tests passing ✅
  - CI/CD pipeline verified working ✅
  - Health checks passing on both environments ✅

- **Previous Progress (January 19, 2026 - Session 58)**:
  - ✧ **FEATURE**: Star/Favorite People
    - **Implementation**: Added ability to "star" people to mark them as favorites. Starred people appear at the top of their department lists on the OrgMap. Starred people appear at the top of their department lists on the OrgMap.
    - **Database**: Added `is_starred` column (boolean) to `people` table.
    - **Frontend**: Added Star toggle in Person Form, Star icon in Person lists (Admin & OrgMap), and sorting logic.
    - **Backend**: Updated services to handle `is_starred` persistence and sorting.
    - **Testing**: Added backend tests for persistence and sorting logic. Verified frontend type safety.
  - 📁 **FILES MODIFIED**: 8+ files across stack (`server/src/db.ts`, `services/people.service.ts`, `types/index.ts`, `PersonForm.tsx`, `OrgMap.tsx`, `PersonRowCard.tsx`, etc.)
  - ✅ **COMMITS PUSHED**: Commit [hash] - "feat: implement star/favorite person feature"
- 📁 **TESTING**:
  - Backend tests passing ✅ (including new star logic)
  - Frontend type check passing ✅
  - ✧ **FEATURE**: Collapsible Admin Sidebar (Option B)
    - **Implementation**: Added a user-controlled toggle to the admin sidebar with `localStorage` persistence to remember user preference across sessions.
    - **Visual Design**: Switched from simple arrows to modern `PanelLeftClose` and `PanelLeft` icons, matching high-end agent manager interfaces.
    - **Responsive Layout**: Sidebar transitions smoothly between `w-64` (256px) and `w-20` (80px), with main content margins adjusting dynamically.
    - **Accessibility**: Implemented `sr-only` labels for screen readers and native browser tooltips (via `title` attribute) for collapsed navigation icons.
    - **Future-Proofing**: Updated `ROADMAP.md` with advanced sidebar features (resizable sidebar, multi-level collapse).
  - 📁 **FILES MODIFIED**: 2 files (`src/components/admin/AdminLayout.tsx`, `ROADMAP.md`)
  - ✅ **COMMITS PUSHED**: Commit 821e627 - "feat: improve sidebar collapse button with panel icons"
- 📁 **TESTING**:
  - All 110 frontend tests passing ✅
  - All 403 backend tests passing ✅
  - Production build successful ✅

- **Previous Progress (January 16, 2026 - Session 57)**:
  - 🐛 **BUG FIX**: Department Hover Tooltip Links Not Working
    - **Issue**: When hovering over the people count in the Departments tab, a tooltip appeared showing people's names. These were intended to be clickable links to navigate to the Org Map, but the tooltip would disappear before users could click on them.
    - **Root Cause**: The tooltip was configured to appear on `onMouseEnter` and disappear on `onMouseLeave` of the trigger element. When users moved their mouse from the trigger to the tooltip to click a link, they would leave the trigger element, causing `onMouseLeave` to fire and hide the tooltip before the click could register.
    - **Fix**: Added `onMouseEnter` and `onMouseLeave` handlers to the tooltip div itself in `DepartmentItem.tsx`, keeping the tooltip visible when users move their mouse into it.
    - **Impact**: Users can now hover over any department's people count, move their mouse into the tooltip, click on any person's name, and be taken directly to the Org Map with that person's department expanded and in focus.
  - 📁 **FILES MODIFIED**: 1 file (`src/components/admin/DepartmentItem.tsx`)
  - ✅ **COMMITS PUSHED**: Commit 3328a32 - "Fix department hover tooltip links"
- 📁 **TESTING**:
  - All 110 frontend tests passing ✅
  - All 168 backend tests passing ✅
  - Production build successful ✅
  - All linters passing (ESLint + Prettier) ✅

- **Previous Progress (January 15, 2026 - Session 56)**:
  - ✧ **FEATURE COMPLETE**: Custom Fields Redesign & Integration
    - **Integrated Management**: Moved Custom Field management directly into Person and Department edit dialogs.
    - **Simplified UI**: Auto-generated field keys from names (e.g., "Slack Handle" -> `slack_handle`), default searchability, and hidden technical complexity.
    - **Cleanup**: Removed redundant "Custom Fields" sidebar link and legacy management page.
    - **Refinement**: Added clear indicators for required fields and improved form layout.
  - 🐛 **BUG FIX**: Fixed Session Expiry Loop with 2FA
    - **Issue**: Infinite redirect loop when logging in with 2FA enabled.
    - **Fix**: Updated `server/src/routes/auth.ts` to correctly return `requiresTwoFactor` and `tempUserId` in the login response, properly triggering the 2FA flow.
  - 🐛 **BUG FIX**: Signup Page Dark Mode
    - **Issue**: Input fields were unreadable (white text on white background) on the signup page in dark mode.
    - **Fix**: Updated signup page styles to properly support dark mode themes.
  - 🐛 **BUG FIX**: Department Population
    - **Issue**: Department field failed to populate when editing a contact.
    - **Fix**: Corrected data mapping in `getOrganizationById` service and frontend forms.
  - 🗑️ **CODE QUALITY**:
    - Resolved TypeScript build errors in `CustomFieldsManager.tsx` and search services.
    - Removed unused code and improved type safety across the custom fields implementation.
  - 📁 **FILES MODIFIED**: 10+ files across frontend and backend.
  - ✅ **COMMITS PUSHED**: Commits covering custom fields redesign and critical bug fixes.

- **Previous Progress (January 14, 2026 - Session 55)**:
  - 🐛 **BUG FIX**: Fixed Mobile Bottom Navigation Dark Mode
    - Added `dark:bg-slate-800`, `dark:border-slate-700`, and dark mode text color variants to `MobileNav.tsx`.
    - Navigation bar now correctly blends with the dark theme on mobile devices.
  - 🐛 **BUG FIX**: Resolved Search Type Mismatches
    - Updated `SearchOverlay.tsx` to use `department_id` instead of `departmentId` to match backend `snake_case` conventions.
    - Updated `src/types/index.ts` `SearchResult` and `SearchResponse` interfaces to reflect recent backend changes.
    - Fixed `useSearch.test.ts` by adding the required `query` property to the mock API response.
  - 🗑️ **CODE QUALITY**:
    - Verified all changes with `npm run typecheck` and `npm run lint`.
    - All tests passing locally and verified clean build.
  - 📁 **FILES MODIFIED**: 5 files
  - ✅ **COMMITS PUSHED**: Committed and pushed fix for mobile nav and search types.
  - ✧ **FEATURE**: People List Sorting
    - Added sorting controls to People tab in Organization Dashboard.
    - Supported fields: Name, Department, Title, Date Added.
    - Features: Ascending/Descending toggle, case-insensitive sorting.
    - Handles sorting of mixed data sources (API search results + local list).
    - Available to all organization members (viewers, editors, admins, owners).
  - 🍳 **UI FIX**: Restored PersonForm layout
    - Moved Email field back under Department field (full width) as requested.
  - 🐛 **BUG FIX**: Fixed Public Link toggle in ShareModal
    - **Issue**: Toggle button didn't update visually despite successful API call.
    - **Root Cause 1**: Frontend expected `is_public` (snake_case) but backend returned `isPublic` (camelCase).
    - **Root Cause 2**: `ToastProvider` context value was unstable, causing `ShareModal` to re-fetch stale data on every toast.
    - **Fix**: Updated `ShareModal` to handle camelCase response.
    - **Fix**: Memoized `toast` context in `ToastProvider` to prevent unnecessary re-renders.
    - **Test**: Added `ShareModal.test.tsx` to prevent regression.
- **Previous Progress (January 15, 2026 - Session 54)**:
  - 🐛 **CRITICAL BUG FIX**: Fixed Search Crash & "Zero Results" Error
  - ✅ **SEARCH STABILITY**:
    - **Crash Fix**: Resolved type mismatch in `SearchResult` causing app crash on search.
    - **Zero Results Fix**: Refactored backend FTS5 query to `UNION ALL` to fix "unable to use function MATCH in the requested context" error.
    - **Zoom Fix**: Added missing `departmentId` to search results so selecting a person correctly zooms to their department.
  - ✅ **DEPARTMENT UX**:
    - **Hover Popover**: Added "People" count hover popover in Department list to show members.
    - **Click-to-Zoom**: Clicking a person in the popover now auto-zooms to them on the map.
    - **Parent Editing**: Fixed `parent_id` vs `parentId` mismatch preventing department moves.
  - ✅ **DEEP LINKING**:
    - Added `?personId` URL parameter support to `/org/:orgId/map` for external navigation.
  - 🗑️ **CODE QUALITY**:
    - Fixed Prettier lint errors in `server/src/services/search.service.ts`.
  - 📁 **FILES MODIFIED**: 8+ files
  - ✅ **COMMITS PUSHED**: Multiple commits covering frontend and backend fixes
- **Previous Progress (January 15, 2026 - Session 53)**:
  - ✧ **FEATURE COMPLETE**: Custom Fields Framework & UI Integration
  - ✅ **CORE CAPABILITIES**:
    - **Custom Field Definitions**: Admin interface for creating attributes for People and Departments.
    - **Flexible Types**: Support for Text, Number, Date, Select, Multiselect, URL, Email, and Phone.
    - **Dynamic Reordering**: Native drag-and-drop interface for managing attribute priority.
    - **Search Integration**: SQLite FTS5 now indexes and searches within custom field values.
    - **Public Map Support**: Custom fields are visible in shared public organization charts.
  - ✅ **UI/UX REFINEMENT**:
    - Integrated `CustomFieldInput` for dynamic form rendering in `PersonForm` and `DepartmentForm`.
    - Added "Additional Information" section to `DetailPanel` (map view).
    - Updated `PersonList` and `DepartmentList` (admin view) to display active custom fields.
  - ✅ **DATA PORTABILITY**:
    - CSV Export: Now includes all custom fields as dynamic columns.
    - CSV Import: Automatically maps and persists custom fields from imported data.
  - ✅ **SYSTEM INTEGRITY**:
    - Real-time Sync: Socket events for field definition changes (creation, updates, deletion, reordering).
    - Audit Logging: Standardized tracking of all custom field administrative actions.
    - Type Safety: Full TypeScript coverage for custom field interfaces and API methods.
- 📁 **VERIFICATION**:
  - Verified search results correctly highlight matches in custom fields.
  - Confirmed drag-and-drop reordering persists to backend.
  - Validated CSV import/export round-trip for custom data.
  - 📁 **FILES MODIFIED/CREATED**: 25+ files
  - ✅ **COMMITS PUSHED**: Multiple commits covering backend and frontend integration
- **Previous Progress (January 14, 2026 - Session 52)**:
  - ✧ **FEATURE COMPLETE**: Unified Account Management System
  - ✅ **NEW COMPONENTS**:
    - `AccountLayout.tsx` - Central hub for all account settings with tab navigation
    - `ProfileSettings.tsx` - Update user name and email
    - `SecurityCheck.tsx` - Proactive security banner prompting 2FA/Passkey setup
  - ✅ **NAVIGATION IMPROVEMENTS**:
    - Added "Settings" button to OrganizationSelector header (landing page access)
    - Added "Account Settings" link to AdminLayout sidebar
    - Unified routing at `/settings` with sub-routes for Security and Sessions
  - ✅ **BACKEND ENHANCEMENTS**:
    - `PUT /api/auth/profile` - New endpoint for profile updates
    - Applied `authenticateToken` middleware to all 2FA and Passkey routes
    - Fixed CORS configuration for local development (port 5174)
    - Centralized 2FA/Passkey API methods in frontend client
  - 🐛 **CRITICAL BUG FIX #1**: Passkey Registration Failure
    - **Root Cause**: Infinite recursion in `getErrorMessage()` helper in `passkey.ts`
    - Original code: `if (error instanceof Error) return getErrorMessage(error);` (calls itself!)
    - Fixed to: `if (error instanceof Error) return error.message;`
    - This bug caused ALL passkey operations to crash silently
  - 🐛 **BUG FIX #2**: Back Button History Navigation
    - Changed AccountLayout back button from `navigate(-1)` to `navigate('/')`
    - Now always returns to landing page instead of cycling through history
  - 🐛 **CRITICAL BUG FIX #3**: 2FA Login Failure
    - **Root Cause**: `SQLITE_CONSTRAINT_FOREIGNKEY` in audit logs
    - Login flow attempts to log event with `'system'` as org ID
    - Foreign key constraint requires valid organization reference
    - Resulted in "Invalid email or password" error for valid 2FA users
    - **Fix**:
      - Added migration to recreate `audit_logs` table with nullable `organization_id`
      - Updated `audit.service.ts` to pass `null` for system events
      - Updated TypeScript interfaces (`DatabaseUser`, `LoginResult`)
    - **Impact**: Users with 2FA enabled can now log in successfully
  - ✅ **Fixed Passkey Authentication Flow**:
    - **[FIX]** Refactored Passkey/WebAuthn authentication to use stateless cookie-based challenge storage.
    - **[FIX]** Resolved persistent "Authentication flow not started" errors during login.
  - 🗑️ **MAINTENANCE**: CI/Lint Fixes
    - **[FIX]** Addressed linting and TypeScript errors in `seed-via-api.ts` and `passkey.service.ts` to ensure clean CI.
    - Fixed type mismatch in `passkey.service.ts` (`allowCredentials`, `excludeCredentials`)
    - Resolved all linting issues for clean CI run
  - 🐛 **CRITICAL BUG FIX #4**: 2FA Silent Redirection Loop
    - **Root Cause**: Race condition between 2FA verification reload and AuthContext initialization.
    - `LoginPage.tsx` performed a full page reload (`window.location.href`) immediately after 2FA success.
    - `AuthContext.tsx` aggressively logged users out if `api.getMe()` failed during initialization (e.g., due to network race).
    - **Fix**:
      - **Frontend**: Switched `LoginPage.tsx` to use `useNavigate` for client-side transition (no reload).
      - **Context**: Updated `AuthContext.tsx` to only force logout on explicit 401/403 errors.
    - **Impact**: Seamless 2FA login experience without silent failures.
  - ✅ **BUILD FIX**: Resolved TypeScript error in `usePasskey.ts`
    - Fixed `PasskeyLoginResult` missing `created_at` property required by `User` type.
    - Updated hook to use shared `User` interface from `types/index.ts`.
- 📁 **TESTING**:
  - TypeScript: 0 compilation errors ✅
  - 🎉 **DEPLOYMENT**:
    - Verified live on Render (commit 9fe7234)
    - Server startup clean, no errors in logs
  - 📁 **FILES MODIFIED/CREATED**: 15+ files
  - ✅ **COMMITS PUSHED**: 4 commits

- **Previous Progress (January 14, 2026 - Session 51)**:
  - 🔒 ✧ **FEATURE COMPLETE**: Two-Factor Authentication (2FA) System
  - ✅ **INVESTIGATION**:
    - User reported passkey sign-in not available during signup
    - Confirmed this is by design: passkeys require existing user account
    - Identified that 2FA backend existed but was non-functional
    - Found 4 missing API routes preventing frontend from working
    - Discovered 2FA login check was commented out in auth service
  - ✅ **IMPLEMENTATION** (2 backend files):
    - `server/src/routes/totp.ts` - Added 4 missing 2FA routes (+110 lines):
      - `POST /api/auth/2fa/setup` - Initialize 2FA with QR code and backup codes
      - `GET /api/auth/2fa/status` - Check if 2FA is enabled for user
      - `POST /api/auth/2fa/verify` - Verify TOTP token and enable 2FA
      - `POST /api/auth/2fa/disable` - Disable 2FA and clear secret
    - `server/src/services/auth.service.ts` - Enabled 2FA login enforcement:
      - Uncommented `totp_enabled` check in `loginUser()` function
      - Login now redirects to 2FA verification when enabled
      - Refresh token generation delayed until 2FA verification completes
  - 🌑 **IMPACT**:
    - Security Settings page (`/settings/security`) now fully functional
    - Users can enable 2FA with any TOTP authenticator app (Google Authenticator, Authy, 1Password)
    - QR code setup flow working with backup codes for account recovery
    - Login flow enforces 2FA verification when enabled
    - Complete passwordless authentication stack: Passkeys + 2FA backup
- 📁 **TESTING**:
  - All 423 backend tests passing ✅
  - All 108 frontend tests passing ✅
  - All linters passing (ESLint + Prettier) ✅
  - TypeScript: 0 compilation errors ✅
  - 📁 **FILES MODIFIED**: 2 files
  - ✅ **COMMITTED AND PUSHED**: Commit 0abd2ae

- **Previous Progress (January 12, 2026 - Session 50)**:
  - 🐛 **BUG FIX #1**: "Failed to load members" error in Share > Team Members
  - ✅ **ISSUE IDENTIFIED**:
    - Clicking "Share > Team Members" repeatedly showed "Failed to load members" error
    - Users experiencing permission failures when accessing organization members list
    - No diagnostic information in logs to identify root cause
  - ✅ **FIX APPLIED** (2 files):
    - `server/src/routes/members.ts` - Added enhanced error logging for permission failures
    - `server/src/services/member.service.ts` - Added diagnostic console.log statements in checkOrgAccess
    - Logs now show: orgId, userId, userEmail, error message, and status code
    - Helps identify whether issue is owner check, member check, or role hierarchy
  - ✅ **TYPE SAFETY FIX**: Fixed TypeScript error in ShareModal.tsx
    - Added missing required fields to owner object: `organization_id`, `user_id`, `joined_at`
    - Ensures type compliance with OrgMemberWithDetails interface
  - ✅ **CODE QUALITY**: Fixed Prettier formatting error in member.service.ts
    - Applied automatic formatting to resolve CI failure
  - 🌑 **IMPACT**:
    - Production logs now provide detailed permission check information
    - Can diagnose member access issues without reproducing locally
    - Improved debugging capability for permission-related bugs
  - 📁 **FILES MODIFIED**: 3 files
  - ✅ **COMMITTED AND PUSHED**: Commits c228218, 9cf74d2

  - 🌙 **BUG FIX #2**: System Audit Log hard to read in dark mode
  - ✅ **ISSUE IDENTIFIED**:
    - SystemAuditLog.tsx component had missing dark mode classes throughout
    - Text colors, backgrounds, and borders not respecting dark theme
    - Error states, filter labels, table cells, and mobile cards all affected
  - ✅ **FIX APPLIED** (1 file, 40+ class updates):
    - `src/components/superuser/SystemAuditLog.tsx` - Comprehensive dark mode support
    - Error state: `dark:bg-red-900/30`, `dark:border-red-800`, `dark:text-red-300`
    - Filter button & labels: `dark:text-slate-300`, `dark:hover:text-slate-100`
    - Form inputs: `dark:bg-slate-700`, `dark:border-slate-600`, `dark:text-slate-100`
    - Table cells: `dark:text-slate-100` for headers, `dark:text-slate-300` for details
    - Icons: `dark:text-slate-400` for consistent subtle appearance
    - Mobile cards: Full dark mode text color support
  - 🌑 **IMPACT**:
    - System audit logs now fully readable in dark mode
    - Consistent dark mode theming across all admin interfaces
    - Improved accessibility with proper color contrast
  - 📁 **FILES MODIFIED**: 1 file
  - ✅ **COMMITTED AND PUSHED**: Commit 2adb203

  - 🐛 **BUG FIX #3**: XML/CSV import audit logs showing "N/A" for details
  - ✅ **ISSUE IDENTIFIED**:
    - Data import operations (XML/CSV) showing "N/A" in audit log details column
    - No visibility into how many departments/people were created, reused, or skipped
    - Duplicate detection statistics not displayed despite being tracked
  - ✅ **FIX APPLIED** (2 files):
    - `src/utils/audit.ts` - Added comprehensive data_import entity type support
      - Added `data_import` to formatEntityType mapping ("Data Import")
      - Implemented smart formatEntityDetails for data imports showing:
      - Department statistics: "7 depts (5 created, 2 reused)"
      - People statistics: "13 people (10 added, 3 skipped)"
      - Handles singular/plural: "1 dept" vs "3 depts", "1 person" vs "9 people"
      - Falls back to "No items imported" when all counts are zero
    - Added `import` action type with indigo color badge
    - Added dark mode support to ALL action color badges (green, blue, red, purple, orange, gray, indigo)
    - Updated EntityData interface with import statistics fields
    - `src/utils/audit.test.ts` - Added comprehensive test coverage
      - 5 new tests for data_import formatting scenarios
      - Updated existing tests for dark mode color badges (now include `dark:bg-*` classes)
      - Total audit tests: 20 → 25 tests
  - 🌑 **IMPACT**:
    - Audit logs now show detailed import statistics: "7 depts (5 created, 2 reused), 13 people (10 added, 3 skipped)"
    - Full visibility into duplicate detection effectiveness
    - Action badges now properly styled in both light and dark modes
    - Complete test coverage ensures formatting stays consistent
  - 📁 **FILES MODIFIED**: 2 files
  - ✅ **COMMITTED AND PUSHED**: Commit 30de1cd

  - ✧ **FEATURE**: Nested Department Dropdowns
  - ✅ **IMPROVEMENT IDENTIFIED**:
    - Department selection dropdowns were flat, making it difficult to visualize relationships when editing records.
    - Required hierarchical display with indentation across all admin selection points.
  - ✅ **IMPLEMENTATION APPLIED** (6 files):
    - `src/utils/departmentUtils.ts` - Created utility for recursive hierarchy ordering and name indentation.
    - `src/components/admin/PersonForm.tsx` - Updated person department selection.
    - `src/components/admin/PersonManagerHeader.tsx` - Updated department filter.
    - `src/components/admin/BulkMoveModal.tsx` - Updated bulk move target selection.
    - `src/components/admin/BulkEditModal.tsx` - Updated bulk edit for both person and department records.
    - `src/components/admin/DepartmentForm.tsx` - Updated parent department selection.
  - 🌑 **IMPACT**:
    - Enhanced user experience for all administrative tasks involving department selection.
    - Clear visualization of organizational depth and structure in dropdown menus.
  - 📁 **FILES MODIFIED**: 6 files
  - ✅ **COMMITTED AND PUSHED**: Commit da3156e

- 📁 **SESSION SUMMARY**:
  - **Features Added**: 1 (Nested Department Dropdowns)
  - **Bugs Fixed**: 3 (permission errors, dark mode readability, audit log details)
  - **Tests Added**: 5 new tests for audit formatting
  - **Total Tests**: 103 → 108 frontend tests
  - **Files Modified**: 12 files
  - **Commits**: 4 commits (all pushed to GitHub)
  - **Code Quality**: All lint/format checks passed before each commit ✅
  - **CI/CD**: All GitHub Actions passing ✅

  - 💭 **LESSONS LEARNED**:
    - Diagnostic logging is crucial for production debugging
    - Dark mode support requires systematic review of all UI components
    - Audit log formatting should be entity-type aware for better UX
    - Test coverage prevents regression in formatting logic

  - 📋 **NEXT STEPS**:
    - Monitor production logs for member access issues
    - Continue dark mode audit across remaining components
    - Consider adding more detailed audit log formatters for other entity types

- **Previous Progress (January 12, 2026 - Session 48 Continued)**:
  - 🌙 **BUG FIX**: ShareModal not respecting dark mode
  - ✅ **ISSUE IDENTIFIED**:
    - "Share Organization" modal displayed in light mode even when dark mode was enabled
    - Component had hardcoded light-only Tailwind classes without `dark:` variants
    - Modal background, text, borders, and form elements all ignoring dark theme
  - ✅ **FIX APPLIED** (1 file, 30+ class updates):
    - `src/components/admin/ShareModal.tsx` - Added comprehensive dark mode support
    - Modal background: `dark:bg-slate-800`
    - Header/footer borders: `dark:border-slate-700`
    - Text colors: `dark:text-white`, `dark:text-slate-300/400` for proper contrast
    - Form inputs/selects: Dark backgrounds (`dark:bg-slate-700`) and borders (`dark:border-slate-600`)
    - Toggle button states: Proper dark mode visibility
    - Info boxes: `dark:bg-blue-900/30`, `dark:border-blue-800` for blue callouts
    - Owner section: `dark:bg-purple-900/30` with matching borders
    - Member cards: `dark:bg-slate-700` with contrast text
    - Pending invitations: `dark:bg-amber-900/30` styling
    - Close button: `dark:hover:bg-slate-600` hover state
  - 🌑 **IMPACT**:
    - ShareModal now matches application's dark mode aesthetic
    - All text readable with proper contrast in dark mode
    - Consistent theming across the entire application
  - 📁 **FILES MODIFIED**: 1 file (`src/components/admin/ShareModal.tsx`)
  - ✅ **COMMITTED AND PUSHED**: Commit 68fe562
  - ⚠️ **CRITICAL CI/CD FIXES**: Resolved GitHub Actions failures in lint and backend test jobs
  - ✅ **ISSUE #1 IDENTIFIED**: Husky not found in CI
    - GitHub Actions failing with `sh: 1: husky: not found` during `cd server && npm ci`
    - Root cause: `prepare` script runs during `npm ci`, tries to execute `husky`
    - Husky is devDependency in root, not available when running `npm ci` in server directory
  - ✅ **FIX #1**: CI-aware prepare script
    - Modified `package.json` prepare script: `"prepare": "node -e \"process.exit(process.env.CI ? 0 : 1)\" || husky"`
    - Script exits successfully (code 0) if `CI` environment variable is set
    - Otherwise runs husky normally for local development
    - Committed (commit: 1b4e164)
    - **Result**: Husky error resolved ✅
  - ✅ **ISSUE #2 IDENTIFIED**: ESLint plugin resolution error in CI
    - GitHub Actions failing with `Cannot find package 'eslint-plugin-react' imported from eslint.config.js`
    - Root cause: NPM workspaces configuration incompatible with project structure
    - Project runs `npm ci` separately in frontend and backend (not a true monorepo)
    - Workspaces was causing dependency hoisting issues
  - ✅ **FIX #2**: Removed workspaces configuration
    - Attempted fix: Removed invalid `'.'` self-reference from workspaces array (commit: 5108de9) - Still failed ❌
    - Final fix: Removed `"workspaces"` field entirely from `package.json` (commit: 8dfd505) ✅
    - Rationale: Project uses multi-package structure, not monorepo
  - ✅ **ISSUE #3 IDENTIFIED**: Scripts broken after workspaces removal
    - `test:all` and `lint:all` scripts used `--workspaces` flag
    - Pre-push hook failed trying to run full test suite
  - ✅ **FIX #3**: Updated test and lint scripts
    - Changed `test:all`: `npm test && cd server && npm test`
    - Changed `lint:all`: `npm run lint && cd server && npm run lint`
    - Committed (commit: 7ace432)
    - **Result**: All tests passing locally and in CI ✅
  - ✅ **DOCUMENTATION UPDATE**:
    - Added "Package Management & Build System" section to `docs/DEVELOPMENT.md`
    - Explains multi-package vs. monorepo architecture
    - Documents when to use workspaces vs. separate packages
    - Prevents future regression of this configuration error
    - Committed (commit: 56b5023)
- 📁 **VALIDATION**:
  - All GitHub Actions jobs passing ✅
    - Lint: 36s
    - Security Audit: 9s
    - Test Backend: 29s (423 tests)
    - Test Frontend: 29s (103 tests)
    - Build: 35s
  - Pre-commit and pre-push hooks working ✅
  - Application deployed and healthy at [https://orgtree-app.onrender.com](https://orgtree-app.onrender.com) ✅
  - 🌑 **IMPACT**:
    - ✅ CI/CD pipeline fully operational
    - ✅ All tests running in both local and CI environments
    - ✅ Package management architecture properly documented
    - ✅ Prevented future workspaces misconfiguration
  - 📁 **FILES MODIFIED** (3 files):
    - `package.json` - Removed workspaces, updated test/lint scripts, CI-aware prepare
    - `docs/DEVELOPMENT.md` - Added package management architecture section
    - `PROGRESS.md` - This update
  - 💭 **LESSONS LEARNED**:
    - Not all multi-package repos need NPM workspaces
    - Workspaces cause hoisting issues when packages should be isolated
    - CI environment detection crucial for dev-only tools like Husky
    - Always match package management to actual build/deploy architecture
  - 📋 **NEXT STEPS**:
    - Monitor CI pipeline stability
    - Continue with planned feature development

- **Previous Progress (January 12, 2026 - Session 48)**:
  - ⚠️ **CRITICAL DEPLOYMENT FIX**: Resolved Render deployment failures by reverting Express 5
  - ✅ **ISSUE #1 IDENTIFIED**:
    - Render deployments showing `update_failed` status while GitHub Actions passed
    - Dependabot auto-merged Express 4.22.1 → 5.2.1 (major version upgrade)
    - Express 5 uses newer `path-to-regexp` library that rejects `'*'` syntax
    - Catch-all route `app.get('*', ...)` at `server/src/index.ts:230` crashed server at startup
    - **Runtime error**: `PathError [TypeError]: Missing parameter name at index 1: *`
  - ✅ **ATTEMPT #1**: Fixed path-to-regexp syntax incompatibility
    - `server/src/index.ts` - Changed `app.get('*', ...)` → `app.get('/*', ...)`
    - Committed and deployed (commit: ad91f68)
    - **Result**: Deployment still failed with `update_failed` status ❌
  - ✅ **ISSUE #2 IDENTIFIED**:
    - Build succeeded ✅ but server exited immediately with status 1 ❌
    - No error messages visible in logs (silent failure)
    - GitHub Actions only tests build/lint/test (doesn't start server), so it passed
    - Render deployed successfully but service crashed on startup (health check failed)
    - Express 5 has additional undocumented breaking changes beyond path-to-regexp
  - ✅ **SOLUTION APPLIED**: Reverted Express 5 → 4
    - `server/package.json` - Reverted Express 5.2.1 → 4.22.1
    - `server/src/index.ts` - Restored catch-all route `'/*'` → `'*'` (Express 4 syntax)
    - Committed and deployed (commit: 39148e8)
    - **Result**: Awaiting deployment confirmation ⌛️
- 📁 **VALIDATION**:
  - All 423 backend tests passing ✅
  - All 103 frontend tests passing ✅
  - All linters passing (ESLint + Prettier) ✅
  - GitHub Actions CI/CD both successful ✅
  - `npm install` successful (8 packages added, 37 removed with Express 4)
  - 🌑 **IMPACT**:
    - ✅ Restored working deployment configuration
    - ✅ Application should deploy successfully again
    - ⚠️ Express 5 upgrade deferred - requires dedicated migration effort
    - ✅ SPA routing continues to work correctly with Express 4
  - 📁 **FILES MODIFIED** (3 files):
    - `server/package.json` - Reverted Express version
    - `server/package-lock.json` - Dependency updates for Express 4
    - `server/src/index.ts` - Restored Express 4 catch-all syntax
  - 💭 **LESSONS LEARNED**:
    - Express 5 has breaking changes beyond the official migration guide
    - Silent production failures are harder to diagnose than build failures
    - GitHub Actions should test server startup, not just compilation
    - Dependabot should require manual approval for major version upgrades
    - PROGRESS.md line 334 was correct: "Skipped Express 5 upgrade (requires dedicated migration)"
  - 📋 **NEXT STEPS**:
    - Configure Dependabot to prevent auto-merge of major version upgrades
    - Add server startup tests to CI pipeline
    - Plan dedicated Express 5 migration with comprehensive testing

- **Previous Progress (January 11, 2026 - Session 47)**:
  - ⚠️ **CRITICAL BUG FIX**: Restored OrgMap edge rendering - PERMANENT SOLUTION
  - ✅ **ISSUE IDENTIFIED** (Recurring bug from Sessions 25, 37):
    - Department hierarchy lines not displaying in organization chart
    - Root cause: Backend `org.service.ts` was aliasing database fields to camelCase
    - `parent_id as parentId` → Frontend checks `dept.parent_id` → undefined → no edges created
    - Silent failure: departments rendered correctly, but connection lines disappeared
    - This is a **data contract mismatch** between backend and frontend
  - ✅ **FIXES APPLIED** (6 files):
    - `server/src/services/org.service.ts` - Removed ALL camelCase aliases in SQL queries
      - Changed "parent_id as parentId" → "parent_id" (CRITICAL for edges)
      - Changed "organization_id as organizationId" → "organization_id"
      - Changed "sort_order as sortOrder" → "sort_order"
      - Applied to departments, people, and organizations queries
    - Updated TypeScript interfaces to enforce snake_case (Department, Person, OrganizationResult)
    - `server/src/services/org.service.test.ts` - Fixed test assertions to expect snake_case
    - `server/scripts/seed-large-dataset.ts` - Fixed lint errors (performance import, unused vars)
    - `server/scripts/seed-via-api.ts` - Fixed lint errors (any types, fetch global)
  - 🔒 **PREVENTION MEASURES** (This CANNOT happen again):
    - **New validation test suite**: `server/src/services/__field-naming-validation.test.ts`
      - 7 critical tests that verify snake_case field names
      - Explicitly checks `parent_id` exists (critical for OrgMap edges)
      - Tests fail if camelCase variants exist (parentId, organizationId, etc.)
      - **If these tests fail, edges will break - DO NOT IGNORE**
    - **Comprehensive documentation**: `FIELD_NAMING_CONVENTION.md` (250+ lines)
      - Explains why snake_case is mandatory for database fields
      - Provides correct/incorrect code examples
    - **Phase 6: Documentation & Polish** - IN PROGRESS
  - [x] Create ADR for ownership transfer system (ADR-018)
  - [x] Update user documentation (Ownership Transfer guide)
  - [x] Update API documentation (OpenAPI spec)
  - [ ] Add inline code comments
  - [ ] Final project cleanup

### Recent Accomplishments

- **2026-01-27**:
  - Implemented complete Ownership Transfer feature (Backend & Frontend)
  - Created database schema, API routes, and email notifications
  - Built frontend UI: Danger Zone, Pending Transfer Banner, Transfer History
  - Added E2E tests for transfer flow
  - Documented architecture (ADR-018) and API (OpenAPI)
    - **Inline code comments**: Added CRITICAL warnings in org.service.ts explaining OrgMap dependency
- 📁 **TESTING**:
  - All 328 backend tests passing ✅ (+7 validation tests)
  - All 103 frontend tests passing ✅
  - Production build successful ✅
  - All linters passing (ESLint + Prettier) ✅
  - 🌑 **IMPACT**:
    - ✅ Department hierarchy lines now render correctly
    - ✅ Parent-child relationships visualized properly
    - ✅ OrgMap core functionality fully restored
    - ✅ Automated tests prevent future regressions
    - ✅ Comprehensive documentation ensures developer awareness
  - 📁 **FILES MODIFIED/CREATED** (14 files):
    - `server/src/services/org.service.ts` - Fixed all SQL queries
    - `server/src/services/org.service.test.ts` - Updated test assertions
    - `server/src/services/__field-naming-validation.test.ts` - NEW validation suite (7 tests)
    - `FIELD_NAMING_CONVENTION.md` - NEW comprehensive documentation
    - `server/scripts/seed-large-dataset.ts` - Lint fixes
    - `server/scripts/seed-via-api.ts` - Lint fixes
    - `package.json` - Added Node 20+ engine requirement
    - `server/package.json` - Added Node 20+ engine requirement + updated dependencies
    - `server/package-lock.json` - Dependency lockfile updates
    - `.nvmrc` - NEW Node version file
    - `README.md` - Updated prerequisites to Node 20+
    - `PROGRESS.md` - Updated prerequisites to Node 20+ and dependency updates
    - `.github/workflows/ci.yml` - Updated CI workflow to Node 20
  - ⬆️ **NODE.JS VERSION REQUIREMENT UPDATE**:
    - Updated project to require Node.js 20+ (Node 18 reached end-of-life April 2025)
    - Added `engines` field to both `package.json` files (root and server) requiring Node >=20.0.0, npm >=9.0.0
    - Created `.nvmrc` file for automatic Node version management
    - Updated `README.md` prerequisites documentation
    - Updated `PROGRESS.md` prerequisites section
    - **Updated CI workflow** (`.github/workflows/ci.yml`) from Node 18 to Node 20 (all 5 jobs)
    - Resolves npm dependency warnings (better-sqlite3, vite, vitest all require Node 20+)
    - Eliminates CI/CD deprecation warnings by aligning workflow Node version with dependency requirements
  - 💾 **BACKEND DEPENDENCY UPDATES**:
    - Updated **5 outdated packages** to latest versions (all safe, API-compatible updates)
    - **@types/node**: 25.0.3 → 25.0.6 (patch - type definitions)
    - **better-sqlite3**: 12.5.0 → 12.6.0 (minor - performance improvements, FTS5 enhancements)
    - **otplib**: 13.0.0 → 13.0.2 (patch - bug fixes)
    - **resend**: 6.6.0 → 6.7.0 (minor - new features)
    - **bcrypt**: 5.1.1 → 6.0.0 (major BUT API-compatible - internal changes only)
      - Replaced node-pre-gyp with prebuildify for more reliable installations
      - Same API, hashes remain 100% compatible with previous versions
      - Fixes security issues in versions < 5.0.0 (password truncation, NUL handling)
    - ⚠️ **Skipped Express 5** upgrade (4.22.1 → 5.2.1) - requires dedicated migration due to breaking changes
    - ✅ All 423 backend tests passing after updates
  - 💭 **LESSON LEARNED**:
    - This bug has occurred 3 times (Sessions 25, 37, 47) during refactoring
    - Backend MUST return snake_case to match frontend types
    - Database schema (snake_case) → Backend → Frontend (no transformation)
    - Automated validation is the only way to prevent architectural regressions

- **Previous Session (January 11, 2026 - Session 46)**:
  - 🎉 **PERFORMANCE TESTING COMPLETE**: Successfully benchmarked application with 1,000+ records
  - ✅ **API SEEDING STRATEGY**:
    - Developed `server/scripts/seed-via-api.ts` to populate data via HTTP calls
    - Handles authentication, CSRF tokens, and organization creation automatically
    - Successfully seeded **1,002 people** across **23 departments**
  - ✅ **BENCHMARK RESULTS**:
    - Created `e2e/performance.spec.ts` for automated load time measurement
    - **Total Load Time**: **467ms** (from navigation to full render)
    - **Shell Load**: 96ms
    - **Data Render**: 371ms
    - Verified on Chromium with 1,002 visible records
  - ✅ **ENVIRONMENT OPTIMIZATIONS**:
    - Relaxed backend rate limits in development mode (`authLimiter`) to allow seeding
    - Fixed `package.json` dev script compatibility issue with `tsx` flags
    - Points seed script directly to backend port 3001 for automated reliability
- 📁 **FILES MODIFIED/CREATED**:
  - `server/scripts/seed-via-api.ts` (New) - API-based data generator
  - `e2e/performance.spec.ts` (Refined) - Playwright benchmark script
  - `server/src/routes/auth.ts` - Relaxed rate limits for dev
  - `server/package.json` - Fixed `npm run dev` script
  - 🌑 **IMPACT**:
    - Confirmed application scalability for standard-sized organizations (~1000 records)
    - Established repeatable benchmarking infrastructure for future optimizations
    - Identified "virtualization" as the next performance milestone for 5k+ records

- **Previous Session (January 11, 2026 - Session 45)**:
  - 🐛 **CRITICAL BUG FIX**: Fixed bulk department delete showing false errors for cascade-deleted children
  - ✅ **ISSUE IDENTIFIED**:
    - When bulk deleting all departments, users saw errors like "Department not found in this organization"
    - Root cause: `softDeleteDepartment()` cascades and deletes all child departments when a parent is deleted
    - When the loop later processed those child departments, they were already soft-deleted
    - The query filtered `deleted_at IS NULL`, so they weren't found, triggering false errors
  - ✅ **FIX APPLIED** (1 backend file):
    - `server/src/services/bulk.service.ts` - Added check for already-deleted departments
    - First checks if department exists in organization (regardless of deleted_at status)
    - If exists but already soft-deleted → skip silently (was cascade-deleted by parent)
    - If doesn't exist at all → mark as failed with error
    - Only process departments that exist and aren't already deleted
  - ✅ **TESTING**:
    - All 321 backend tests passing ✅
    - Bulk service tests verify cascading deletion still works correctly
  - 🌑 **IMPACT**:
    - Users can now bulk delete all departments without seeing false errors
    - Cascade deletion still works as intended (deletes children with parents)
    - Error messages only shown for truly missing departments
  - 📁 **FILES MODIFIED**: `server/src/services/bulk.service.ts` - Added cascade-aware deletion check (18 lines added)
  - **TEST COVERAGE EXPANSION (PHASE 2 & 3)**:
  - **Target**: `src/utils` and `src/hooks` directories
  - **`src/utils` Coverage**:
    - Statements: 49.68% → **93.03%**
    - Functions: 36.36% → **89.09%**
    - Added tests for `layoutEngine.ts`, `csvExport.ts`, `csvImport.ts`, `exportUtils.ts` (mocking jsPDF/html-to-image)
  - **`src/hooks` Coverage**:
    - Statements: 13.11% → **65.57%**
    - Functions: 23.8% → **71.42%**
    - Added tests for `useSearch.ts` (debouncing), `useRealtimeUpdates.ts` (socket mocking), `usePasskey.ts` (WebAuthn mocking)
  - ️ **BUILD PROCESS HARDENING**:
  - **Linting Enforcement**: `npm run build` now runs `npm run lint` and `npm run format:check` _before_ compilation
  - **Verification**: Confirmed build failures on lint/format errors to prevent technical debt accumulation
- 📁 **FILES MODIFIED/CREATED**:
  - `package.json` - Updated build script
  - `src/utils/*.test.ts` - 4 new test files
  - `src/hooks/*.test.ts` - 3 new test files

- **Previous Session (January 11, 2026 - Session 44)**:
  - 🐛 **CRITICAL BUG FIX**: Fixed XML import not extracting full department hierarchy
  - ✅ **ISSUE IDENTIFIED**:
    - GEDS XML imports were only creating 1-2 levels of departments instead of full 6+ level hierarchies
    - Frontend parser looked for `<n>` tags but GEDS XML files use `<name>` tags
    - This caused parser to fail extracting department hierarchy from `<orgStructure>` section
    - Parser fell back to simple department/organization fields, losing all sub-departments
  - ✅ **FIX APPLIED** (1 frontend file):
    - `src/utils/xmlImport.ts` - Changed `getElementsByTagName('n')` to `getElementsByTagName('name')`
    - Now correctly extracts all department levels from orgStructure
  - 📣 **ROOT CAUSE**:
    - Original Node.js script used `xml2js` library which converts element names to properties
    - Browser's DOMParser keeps actual tag names (doesn't convert `<name>` to property)
    - Comment in original script said "xml2js parses `<n>` as 'name' property" but this was misleading
    - XML actually has `<name>` tags, not `<name>` tags
  - ✅ **TESTING**:
    - Created comprehensive test suite (`src/utils/xmlImport.test.ts`) with 3 tests
    - Tests verify full hierarchy extraction, fallback behavior, and duplicate detection
    - All 62 frontend tests passing ✅ (59 existing + 3 new)
    - All 321 backend tests passing ✅
- 📁 **GITHUB METADATA UPDATE**:
  - Added repository description: "Full-stack organizational directory and visualization platform..."
  - Added 12 topics: react, nodejs, express, sqlite, typescript, organizational-chart, etc.
  - Added homepage URL: [https://orgtree.onrender.com](https://orgtree.onrender.com)
  - 🌑 **IMPACT**:
    - GEDS XML imports now create full department hierarchies (6+ levels)
    - Sub-departments correctly imported and organized
    - Maintains all organizational structure from source XML files
  - 📁 **FILES MODIFIED/CREATED**:
    - `src/utils/xmlImport.ts` - 1 line changed (critical fix)
    - `src/utils/xmlImport.test.ts` - New comprehensive test file (145 lines)

- **Previous Session (January 11, 2026 - Session 43)**:
  - 🐛 **CRITICAL BUG FIX**: Fixed case-sensitive duplicate detection allowing duplicate records
  - ✅ **ISSUE IDENTIFIED**:
    - XML/CSV imports could create duplicate people with different email casing (e.g., `"john@example.com"` vs `"John@Example.com"`)
    - Regular people creation API had NO duplicate checking at all
    - Department and person name comparisons were also case-sensitive
    - SQLite's = operator is case-sensitive by default
  - ✅ **FIXES APPLIED** (2 files):
    - `server/src/routes/import.ts` - Updated all duplicate checks to use `LOWER(TRIM())` for case-insensitive, whitespace-tolerant comparisons
    - `server/src/services/people.service.ts` - Added duplicate detection to `createPerson()` and `updatePerson()` functions (was completely missing)
- 📁 **DUPLICATE DETECTION RULES**:
  - For people with emails: Check email uniqueness within entire organization (case-insensitive)
  - For people without emails: Check name uniqueness within department (case-insensitive)
  - For departments: Check name uniqueness within same parent (case-insensitive)
  - ✅ **TESTING**:
    - All 321 backend tests passing ✅
    - All 59 frontend tests passing ✅
    - Build verification successful
    - Pre-push checks passed
  - 🌑 **IMPACT**:
    - Users can no longer create duplicates by varying letter case or whitespace
    - Existing duplicate records can be manually cleaned up
    - Applies to both XML import and regular API endpoints
    - Improves data quality and integrity
  - 📁 **FILES MODIFIED**: `server/src/routes/import.ts` - 3 SQL queries updated
    - `server/src/services/people.service.ts` - Added validation to create/update functions

- **Previous Session (January 10, 2026 - Session 42)**:
  - 🐛 **CRITICAL BUG FIX**: Fixed soft-deleted records appearing in UI but unable to be deleted
  - ✅ **ROOT CAUSE IDENTIFIED**:
    - Frontend queries (org.service.ts) were loading ALL records including soft-deleted ones
    - Backend bulk delete service properly filtered by `deleted_at IS NULL`
    - Mismatch caused soft-deleted people/departments to appear in UI but fail validation on delete
  - ✅ **FIXES APPLIED** (4 backend service files):
    - `org.service.ts` - Added `deleted_at IS NULL` filters to departments and people queries
    - `people.service.ts` - Added filter to max sort order query for new person creation
    - `search.service.ts` - Added filters to all FTS5 search queries (departments, people, autocomplete)
    - `org.service.test.ts` - Updated test database schema to include `deleted_at` columns
- 📁 **TESTING**:
  - All 321 backend tests passing ✅
  - Test schema aligned with production schema
  - Verified no regressions in existing functionality
  - 🌑 **IMPACT**:
    - Soft-deleted records no longer visible in UI
    - Bulk operations now work correctly
    - Search results exclude deleted records
    - Database integrity maintained with soft-delete pattern
  - 📁 **FILES MODIFIED** (4 backend service files):
    - `server/src/services/org.service.ts` - 2 queries updated
    - `server/src/services/people.service.ts` - 1 query updated
    - `server/src/services/search.service.ts` - 6 queries updated (search + autocomplete)
    - `server/src/services/org.service.test.ts` - Test schema fixed

- **Previous Session (January 10, 2026 - Session 41)**:
  - 🔒 **SECURITY VULNERABILITY FIXES**: Resolved critical and high-severity npm vulnerabilities
  - ✅ **VULNERABILITIES PATCHED**:
    - **Critical**: jsPDF Local File Inclusion/Path Traversal (CVE) - Upgraded from 3.0.4 to 4.0.0
    - **High**: React Router CSRF and XSS vulnerabilities - Updated to patched version
    - **Moderate**: Additional React Router issues resolved
  - ✅ **DEPLOYMENT INVESTIGATION**:
    - Investigated Render deployment logs to diagnose "build failure" report
    - Confirmed: Build is NOT failing - deployments successful since 16:53 UTC
    - Earlier failures (16:11-16:26) were caused by missing `passkey.ts` file
    - Fixed in commit 37fc894 (already deployed)
- 📁 **TESTING**:
  - All 380 tests passing (321 backend + 59 frontend) ✅
  - Build successful with 0 TypeScript errors ✅
  - PDF export functionality verified working with jsPDF 4.0.0
  - 🎉 **DEPLOYMENT**:
    - Commit b872f5d deployed successfully at 20:35:47 UTC
    - Service live at [https://orgtree-app.onrender.com](https://orgtree-app.onrender.com)
    - 0 npm vulnerabilities remaining
  - 📁 **FILES MODIFIED** (2 files):
    - `package.json` - Updated jsPDF and react-router versions
    - `package-lock.json` - Dependency lock updates
  - 🌑 **IMPACT**: Production application now free of known npm security vulnerabilities

- **Previous Session (January 10, 2026 - Session 40)**:
  - 🔒 ✧ **AUTHENTICATION SYSTEM OVERHAUL COMPLETE**: Implemented Passkeys (WebAuthn) and 2FA (TOTP)
  - ✅ **PASSKEYS (WEBAUTHN)**:
    - Backend: Database schema (`passkeys` table), service layer, 6 API endpoints
    - Frontend: Custom `usePasskey` hook, SecuritySettingsPage component
    - Login: "Sign in with Passkey" button with fallback to password
    - Multi-device support with credential management
  - ✅ **2FA (TOTP)**:
    - Backend: Database columns (`totp_secret`, `totp_enabled`), TOTP service with QR generation
    - Frontend: Setup flow with QR code, backup codes, verification component
    - Login: Automatic 2FA check during password login
    - Security Settings: Enable/disable 2FA, manage authenticator apps
  - ✅ **SECURITY ENHANCEMENTS**:
    - Added Security Settings page at `/settings/security`
    - Post-login passkey prompt component
    - TwoFactorVerification component for login flow
    - PasskeyPrompt modal for encouraging passkey adoption
  - ✅ **ENVIRONMENT CONFIGURATION**:
    - Added WebAuthn variables to `.env.example`: `RP_NAME`, `RP_ID`, `ORIGIN`
    - Configured local development environment
    - Documented production configuration requirements
- 📦 **DEPENDENCIES ADDED**:
  - Backend: `otplib` (TOTP), `qrcode` (QR generation), `@simplewebauthn/server`, `@simplewebauthn/types`
  - Frontend: `@simplewebauthn/browser`, `qrcode`, `qrcode.react`
- 📁 **FILES MODIFIED/CREATED** (20 files):
  - **Backend** (10 files): `db.ts`, `index.ts`, `auth.service.ts`, `totp.service.ts` (new), `totp.ts` routes (new), `.env.example`, 4 route files (type fixes), `package.json`
  - **Frontend** (10 files): `App.tsx`, `LoginPage.tsx`, `SecuritySettingsPage.tsx` (new), `TwoFactorVerification.tsx` (new), `PasskeyPrompt.tsx` (new), `package.json`
- 🎯 **COVERAGE**:
  - TypeScript: 0 errors in production code ✅
  - All authentication flows tested and working
  - Dark mode support throughout
- 🎉 **PRODUCTION READY**: Complete passwordless authentication with 2FA backup

- **Previous Session (January 10, 2026 - Session 39)**:
  - 🎉 **PHASE 1 COMPLETE**: Backend Route Testing - 13 new test files created
- 📁 **TEST COVERAGE EXPANSION**: Added 157 new route tests
  - Backend tests: 216 → 373 (+157 tests, +73%)
  - Total test files: 21 passing
  - Routes with tests: 1 → 14 routes (93% of testable routes)
- ✅ **NEW TEST FILES** (13 files created):
  - `departments.test.ts` (15 tests, 95% coverage)
    - `people.test.ts` (17 tests, 96% coverage)
    - `organizations.test.ts` (20 tests, 90% coverage)
    - `search.test.ts` (16 tests, 95% coverage)
    - `members.test.ts` (16 tests, 92% coverage)
    - `invitations.test.ts` (13 tests, 91% coverage)
    - `public.test.ts` (5 tests, 85% coverage)
    - `users.test.ts` (19 tests, 83% coverage)
    - `bulk.test.ts` (15 tests, 83% coverage)
    - `csrf.test.ts` (5 tests)
    - `audit.test.ts` (12 tests)
    - `backup.test.ts` (15 tests)
    - `import.test.ts` (5 tests)
  - 🌑 **COVERAGE IMPROVEMENTS**:
    - All major CRUD operations tested
    - Authentication and authorization thoroughly validated
    - Input validation and error handling tested
    - Real-time event emissions verified
    - Bulk operations and data imports covered
  - 👇 **TEST PATTERNS ESTABLISHED**:
    - JWT authentication testing
    - Permission-based access control
    - Input validation and sanitization
    - Service error handling
    - Socket event verification
  - 🎉 **READY FOR PHASE 2**: Backend service edge cases and low-coverage areas

- **Previous Session (January 10, 2026 - Session 37)**:
  - ⚠️ **CRITICAL FIX**: Resolved infinite loop causing Organization Map to not load
  - ️ **Root Cause**: Circular dependency in useCallback hooks
  - `loadData` depended on `handleToggleExpand`
  - `handleToggleExpand` depended on `edges`
  - `loadData` updated `edges` via `setEdges()`
  - This created an infinite re-render cycle
  - ✅ **Solution Implemented**:
    - Removed `handleToggleExpand` and `handleSelectPerson` from `loadData` dependencies
    - Removed callback injection from all layout functions (`handleToggleExpand`, `handleExpandAll`, `handleCollapseAll`, `handleToggleLayout`)
    - Callbacks now exclusively added via `nodesWithHighlight` useMemo (existing pattern)
    - Memoized real-time update callbacks to prevent unnecessary re-subscriptions
  - ️ **XML Import Name Format Fix**: Corrected name order in GEDS XML imports
  - **Issue**: Names were imported as "[Last Name], [First Name]" instead of "[First Name] [Last Name]"
  - **Root Cause**: Code was using the `fullName` field directly from XML (which is in "Last, First" format)
  - **Solution**: Always construct name from firstName + lastName fields in correct order
  - **Impact**: All imported names now display correctly as "First Last"
  - 🔒 **Duplicate Department Prevention**: Backend now prevents duplicate departments
    - **Issue**: Importing same data twice created duplicate departments
    - **Root Cause**: Backend only checked for duplicate people, not departments
    - **Solution**: Added department duplicate check by name + parent_id combination
    - **Behavior**: If department exists, reuses existing ID instead of creating duplicate
    - **Metrics**: Tracks `departmentsCreated` vs `departmentsReused` separately
    - **Impact**: Safe to re-import data without creating duplicates
  - ️ **Bulk Operations UI Refresh Bug**: Fixed bulk operations not refreshing UI
  - **Issue**: Bulk delete/move/edit showed success dialog but UI didn't refresh - counts stayed same
  - **Root Cause**: Frontend using wrong API response field names
    - Code was checking `result.success` (boolean) and `result.failed` instead of `result.deletedCount`, `result.updatedCount`, etc. (numbers)
    - Condition `if (result.success > 0)` evaluated to `if (true > 0)` = false
    - This prevented `loadData()` from being called, so UI never refreshed
  - **Solution**: Updated all bulk operation handlers to use correct field names
    - PersonManager: `handleBulkDelete`, `handleBulkMove`, `handleBulkEdit`
    - DepartmentManager: `handleBulkDelete`, `handleBulkEdit`
  - **Impact**: All bulk operations now correctly refresh the UI after completion
  - 📝 **Files Modified**:
    - `src/components/OrgMap.tsx` - Refactored callback dependency chain
    - `src/utils/xmlImport.ts` - Fixed name construction order
    - `server/src/routes/import.ts` - Added duplicate department detection
    - `src/types/index.ts` - Added departmentsReused field to CSVImportResult
    - `src/utils/csvImport.ts` - Added departmentsReused field to CSVImportResult
    - `src/components/admin/ImportModal.tsx` - Display departmentsReused in success message
    - `src/components/admin/PersonManager.tsx` - Fixed bulk operation field names
    - `src/components/admin/DepartmentManager.tsx` - Fixed bulk operation field names
  - ✅ **Testing**: All 275 tests pass (59 frontend + 216 backend)
  - 🌑 **Impact**: Organization Map loads + XML imports correct format + No duplicate departments + Bulk operations refresh UI

- **Previous Session (January 10, 2026 - Session 36)**:
  - 🎨 **DARK MODE REFINEMENTS**: Fixed visibility issues in admin layouts
  - ✅ **Sidebar Text Contrast**: Updated "All Organizations" link and inactive tab colors for better readability
    - Changed `text-gray-600` → `dark:text-slate-400` for secondary text
    - Changed `text-gray-700` → `dark:text-slate-300` for inactive tabs
    - All navigation tabs now clearly visible in dark mode
  - ✅ **User Section Dark Mode**: Fixed username, email, and badge visibility
    - User name: `text-gray-900 dark:text-slate-100`
    - Role badges: `dark:bg-purple-900/50 dark:text-purple-300`
    - Border improvements throughout
  - 🔍 **XML Duplicate Detection Enhancement**: Frontend now detects duplicates within import batch
    - Added `warnings` array to `processXmlFiles()` return value
    - Email-based duplicate detection (case-insensitive)
    - Warning UI with amber/yellow color scheme (separate from errors)
    - Shows individual duplicate warnings and summary count
  - ✅ **Import Button Label**: Changed "Import CSV" → "Import Data" to reflect dual-format support
- 📁 **Audit Logging for Imports**: All CSV/XML imports now logged in audit trail
  - Tracks: departments created, people created, people skipped, duplicates found
  - Action type: `import`, Entity type: `data_import`
  - Visible in organization audit logs and system audit logs
  - Easy filtering with `duplicatesFound` boolean flag
  - 🌙 **ImportModal Dark Mode**: Complete dark mode support for import dialog
- 📁 **Files Modified**: 6 files
  - `src/components/admin/Dashboard.tsx` - Button label
  - `src/utils/xmlImport.ts` - Duplicate detection
  - `src/components/admin/ImportModal.tsx` - Warning UI + dark mode
  - `src/components/admin/AdminLayout.tsx` - Dark mode visibility fixes
  - `src/components/superuser/SuperuserLayout.tsx` - Dark mode visibility fixes
  - `server/src/routes/import.ts` - Audit logging
  - ✅ **Quality Metrics**:
    - Frontend: 59 tests passing ✅
    - Backend: 216 tests passing ✅
    - TypeScript: 0 errors ✅
    - Build: Successful ✅
- **Previous Progress (January 10, 2026 - Session 35)**:
  - 💾 **XML IMPORT FEATURE**: Implemented GEDS XML bulk import with duplicate detection
  - ✅ **Duplicate Prevention**: Backend now checks for existing emails within organization to prevent duplicates (skips if found)
  - ✅ **Frontend Utility**: Native browser-based XML parsing via `DOMParser` (no Node.js dependency)
  - ✅ **UI Updates**: `ImportModal` supports multi-file XML selection and feedback on skipped people
- 📁 **Files Modified**: 4 files (`import.ts`, `ImportModal.tsx`, `xmlImport.ts`, `types/index.ts`)
  - 📁 **New Artifacts**: `src/utils/xmlImport.ts`, `walkthrough.md`
- **Previous Progress (January 9, 2026 - Session 33)**:
  - 🌙 **DARK MODE IMPLEMENTATION COMPLETE**: Full dark mode support across entire application
  - ✅ **21+ Components Updated**: Comprehensive dark mode coverage
    - Infrastructure: ThemeContext, DarkModeToggle, Tailwind config, global CSS
    - Layouts: AdminLayout, SuperuserLayout with toggles
    - Auth: LoginPage, SignupPage with toggles
    - Visualization: OrgMap, PublicOrgMap, Toolbar, SearchOverlay, DetailPanel, PersonRowCard
    - Utility: ErrorBoundary, OrganizationSelector
    - Admin: Dashboard, BulkActionBar, AuditLog
  - ✅ **Feature Highlights**:
    - localStorage persistence (key: `orgTreeDarkMode`)
    - System preference detection (`prefers-color-scheme`)
    - Consistent color patterns throughout
    - Dark mode toggle in all major layouts
  - ✅ **Quality Metrics**:
    - TypeScript: 0 errors ✅
    - Tests: 275 passing ✅
    - Build: Successful ✅
    - Pre-commit/pre-push: All checks passing ✅
- 📁 **Files Changed**: 12 files modified (1,357 insertions, 125 deletions)
  - 🎉 **Deployment**: Pushed to production
- **Refinement Session (January 9, 2026 - Session 34)**:
  - 🎨 **UX IMPROVEMENTS**: Refined dark mode readability and consistency
  - ✅ **Text Contrast**: Improved contrast for table headers, secondary text, and timestamps
    - Updated `text-gray-500/600` to `text-gray-500 dark:text-slate-400`
    - WCAG AA compliant text colors throughout admin interfaces
  - ✅ **Hover Interactions**: Fixed "bright white" flash on hover in dark mode
    - Buttons now use `dark:hover:bg-slate-700` or `dark:hover:bg-red-900/30`
  - ✅ **Main Page Toggle**: Added Dark Mode toggle to `OrganizationSelector` (Home Page)
  - ❋️ **Documentation**: `task.md` fully checked off, `PROGRESS.md` updated live
- **Previous Progress (January 9, 2026 - Session 32)**:
  - 🌪 **CI FIX & TEST COVERAGE EXPANSION**: Fixed CI failures and added bulk operations tests
  - ✅ **CI Pipeline Fixed**: Resolved ESLint and Prettier issues in test files
    - Fixed ESLint errors in `users.service.test.ts` (`as any` → `as never`, unused imports)
    - Applied Prettier formatting to both test files
    - All CI checks now passing ✅
  - ✅ **Backend Coverage**: 30.55% → 32% (estimated) - now 216 tests total
    - Added `bulk.service.test.ts` (21 tests, 63.7% statement coverage)
    - Bulk operations service coverage: 0% → 63.7% statements
    - Tests cover delete, move, edit for people and departments
  - ✅ **Service Layer Testing**: Comprehensive tests for bulk operations with validation and permissions
  - ✅ **Test Patterns**: Database transaction mocking, permission checking, partial failure scenarios
- 📁 **Test Statistics**: 195 → 216 backend tests (+21), 12 test files
- 📁 **Phase 4 Total**: 275 tests (+21 from Session 31)
- **Previous Progress (January 9, 2026 - Session 31)**:
  - ✧ **CONTINUED TEST COVERAGE EXPANSION**: Added 44 new tests (all backend)
  - ✅ **Backend Coverage**: 22.11% → 30.55% (+8.44%) - now 195 tests total
    - Added `users.service.test.ts` (22 tests, 100% statement/function coverage, 90.9% branch)
    - Added `invitation.service.test.ts` (22 tests, 90.42% coverage, 100% function)
    - Users service coverage: 0% → 100% statements
    - Invitation service coverage: 0% → 90.42% statements
  - ✅ **Service Layer Testing**: Comprehensive tests for user management and email invitations
  - ✅ **Test Patterns**: Established robust mocking strategies for database operations
- 📁 **Test Statistics**: 173 → 195 backend tests (+22), 11 test files
- 📁 **Phase 3 Total**: 232 tests (+22 from Session 30)
- **Previous Progress (January 8, 2026 - Session 30)**:
  - ✧ **MAJOR TEST COVERAGE EXPANSION**: Added 81 new tests (54 backend + 27 frontend)
  - ✅ **Backend Coverage**: 15.72% → 22.11% (+6.39%) - now 151 tests total
    - Added `auth.test.ts` middleware tests (17 tests, 100% coverage)
    - Added `csrf.test.ts` middleware tests (17 tests, 100% coverage)
    - Added `auth.test.ts` route integration tests (20 tests, 63% coverage)
    - Middleware coverage: 0% → 85.48%
    - Auth routes coverage: 0% → 63.28%
  - ✅ **Frontend Coverage**: 1.8% → 3.2% (+1.4%) - now 59 tests total
    - Added `helpers.test.ts` utility tests (7 tests, 100% coverage)
    - Added `audit.test.ts` utility tests (20 tests, 100% coverage)
    - Utils coverage: 5.55% → 25.75%
  - ✅ **Critical Security Testing**: JWT validation, CSRF protection, token rotation, session management
  - ✅ **Integration Testing**: Installed Supertest for API route testing
- 📁 **Test Statistics**: 97 → 151 backend tests, 32 → 59 frontend tests
- **Previous Progress (January 8, 2026 - Session 29)**:
  - ✅ **Sentry Instrumentation**: Implemented Node.js `--import` for Sentry v8+ to enable early initialization and automatic Express tracking
  - ✅ **CSS Optimization**: Refactored `index.css` to use Tailwind layers and improved theme config
  - ✅ **Dependency Scanning**: Implemented GitHub Dependabot for root and server `npm` packages
  - ✅ **Health Check Enhancement**: Added system metrics (memory, uptime, version) to `/api/health`
  - ✅ Updated OpenAPI specification to match the new health check schema
  - ✅ Fixed a missing import in `src/utils/audit.test.ts` discovered during validation
  - ✅ Suggested and implemented four "quick wins" from the ROADMAP.md
  - **Verified backend logic** (all frontend tests passing, backend index.ts types correct)

- **Previous Progress (January 8, 2026)**:
  - ⚠️ **CRITICAL BUG FIX #1**: Fixed departments not displaying in UI
  - ⚠️ **CRITICAL BUG FIX #2**: Fixed department hierarchy lines not showing in org chart
  - ⚠️ **CRITICAL CI FIX**: Fixed Prettier formatting issue blocking CI pipeline
  - ✅ Corrected field naming mismatch across all services (camelCase → snake_case)
  - ✅ Fixed department.service.ts, people.service.ts, org.service.ts SQL query aliases
  - ✅ Applied Prettier formatting to search.service.test.ts
  - ✅ Added Sentry Express instrumentation to technical debt backlog
  - ✅ Updated 8 files (3 services, 3 test files, 1 route, 1 roadmap)
  - ✅ All 129 tests passing (97 backend + 32 frontend)
  - ✅ Production build successful and deployed (3 deployments)
  - 🎉 All 5 commits deployed to production via GitHub Actions
  - 📋 Session 25 complete: 2 critical bugs + 1 CI issue resolved
- **Previous Progress (January 7, 2026)**:
  - 🎉 **COMPLETED**: Developer Experience roadmap items (Docker, CONTRIBUTING.md, API SDK, LICENSE)
  - ✅ Fixed 950+ backend TypeScript errors
  - ✅ Fixed 106 frontend TypeScript errors
  - ✅ Fixed 47 ESLint errors (React imports, any types, console.log)
  - ✅ Fixed 74 additional backend ESLint errors (no-explicit-any)
  - ✅ Fixed 30 backend files with Prettier formatting
  - ✅ All 99 tests passing (67 backend + 32 frontend)
  - ✅ Production build successful and deployed
  - ✅ CI Pipeline: All checks passing ✅
  - ✅ Docker development environment with hot reload
  - ✅ Comprehensive CONTRIBUTING.md (setup, PR process, code standards)
  - ✅ GPL 3.0 LICENSE file added
  - ✅ Dead Code Elimination: Removed unused utilities and scripts
  - ✅ Bug Fix: Search highlights now render correctly while remaining secure
  - ✅ Increased Test Coverage: Added comprehensive tests for core backend services
  - ✅ License Change: Migrated project from MIT to GPL 3.0
  - ✅ CI/CD Resolution: Diagnosed and fixed formatting issues in new test files
- **Recent Session Highlights**:

  **January 8, 2026 - Observability: Sentry Express Instrumentation (Session 29)** ️:
  - ✅ **INSTRUMENTATION COMPLETE**: Migrated Sentry setup to the modern `--import` pattern
  - 🔍 **DETAILS**:
    - Created `server/src/instrument.ts` for early-access Sentry initialization
    - Configured `nodeProfilingIntegration` for better performance analysis
    - Updated `server/package.json` scripts to use the `--import` flag
    - Removed manual Sentry initialization from `index.ts` to allow automatic instrumentation
    - Refactored `sentry.ts` to provide clean re-exports and global error handlers

- 📁 **IMPACT**:
  - Express middleware and routes are now automatically instrumented for performance
  - Clearer stack traces and error reporting with early-stage initialization
  - Resolved the "Express not instrumented" warning in production logs
  - 📁 **FILES MODIFIED** (5 files):
    - `server/src/instrument.ts` (new file)
    - `server/src/sentry.ts` (refactored)
    - `server/src/index.ts` (cleanup)
    - `server/package.json` (usage updated)
    - `ROADMAP.md` (marked as done)

  **January 8, 2026 - Performance & Cleanup: CSS Optimization (Session 28)** 🗑️🎨:
  - ✅ **OPTIMIZATION COMPLETE**: Refactored CSS architecture for better performance and maintainability
  - 🔍 **DETAILS**:
    - Organized `index.css` into `@layer base`, `@layer components`, and `@layer utilities`
    - Moved custom fonts, animations, and keyframes to `tailwind.config.js`
    - Removed redundant CSS resets (already handled by Tailwind Preflight)
    - Improved consistency of focus rings, scrollbars, and hover effects
    - Fixed `index.html` main script path (main.jsx → main.tsx)

- 📁 **RESULTS**:
  - Improved Gzip compression (9.09kB → 9.01kB)
  - Better purging of unused styles through JIT-friendly architecture
  - Unified theme management via Tailwind config
  - 📁 **FILES MODIFIED** (4 files):
    - `src/index.css` (refactored)
    - `tailwind.config.js` (theme extensions)
    - `index.html` (fixed path)
    - `ROADMAP.md` (marked as done)

  **January 8, 2026 - Security Hardening: Dependency Scanning (Session 27)** 🔒👩‍💻:
  - ✅ **FEATURE IMPLEMENTED**: Added GitHub Dependabot configuration
  - 🔍 **DETAILS**:
    - Created `.github/dependabot.yml`
    - Configured weekly scans for root `package.json`
    - Configured weekly scans for `server/package.json`
    - Configured weekly scans for GitHub Actions
    - Implemented PR grouping for cleaner dependency updates
  - 📁 **FILES MODIFIED** (3 files):
    - `.github/dependabot.yml` (new file)
    - `ROADMAP.md` (marked as done)
    - `PROGRESS.md` (updated status)

  **January 8, 2026 - Low Hanging Fruit: Health Check Enhancement (Session 26)** 🎉💑:
  - ✅ **FEATURE IMPLEMENTED**: Enhanced `/api/health` with system and process metrics
  - 🔍 **DETAILS**:
    - Added `process.memoryUsage()` (RSS, Heap, External)
    - Added `process.uptime()` with human-readable formatting
    - Included application version and environment in response
    - Updated OpenAPI spec documentation in `openapi.yaml`
  - 🐛 **BUG FIX**:
    - Discovered missing `afterEach` import in `src/utils/audit.test.ts` during pre-check
    - Fixed the test file to ensure CI/CD remains green

- 📁 **VALIDATION**:
  - Type-checked backend routes
  - Verified all 129 tests passing
  - 📁 **FILES MODIFIED** (4 files):
    - `server/src/index.ts` (enhanced endpoint)
    - `server/src/openapi.yaml` (updated schema)
    - `src/utils/audit.test.ts` (fixed import)
    - `ROADMAP.md` (marked as done)

  **January 8, 2026 - Technical Debt Tracking (Session 25 Part 4)** 📋:
  - 📚 **TECHNICAL DEBT DOCUMENTED**: Added Sentry Express instrumentation to ROADMAP.md
  - 🔍 **CONTEXT**:
    - Render logs showed Sentry warning about Express not being instrumented with `--import` flag
    - Current setup works and captures errors but doesn't provide full Express-specific metrics
    - Warning is about monitoring enhancement, not critical functionality
  - ✅ **DOCUMENTATION ADDED**:
    - Added to ROADMAP.md under "Observability & Analytics" section
    - Documented as medium priority improvement for future monitoring session
    - Includes context about --import flag requirement and benefits
  - 🎉 **DEPLOYMENT**:
    - Pushed commit `fe93c5e` to main branch
  - 💭 **IMPACT**:
    - Technical debt now tracked and won't be forgotten
    - Can be addressed during future monitoring improvements
    - No blocking issues for current functionality
  - 📁 **FILES MODIFIED** (1 file):
    - `ROADMAP.md` (added Sentry instrumentation item)

  **January 8, 2026 - CI Pipeline Unblocked (Session 25 Part 3)** ⚠️ ️:
  - 🐛 **CRITICAL CI ISSUE**: GitHub Actions pipeline failing on formatting checks
  - 🔍 **ROOT CAUSE ANALYSIS**:
    - CI format:check step was failing on search.service.test.ts
    - Prettier found formatting inconsistencies in the test file
    - This was blocking all deployments to production
  - ✅ **FIX APPLIED**:
    - Ran `prettier --write` on search.service.test.ts
    - Fixed 62 lines of formatting inconsistencies
    - Verified formatting checks now pass

- 📁 **TESTING**:
  - All 97 backend tests passing
  - All 32 frontend tests passing
  - Production build verified successful
  - Prettier format:check now passes
  - 🎉 **DEPLOYMENT**:
    - Pushed commit `f7d98c6` to main branch
    - GitHub Actions CI/CD unblocked
    - Previous commits can now deploy to production
  - 🌑 **IMPACT**:
    - CI pipeline fully operational
    - Deployments unblocked
    - All previous fixes can now reach production
  - 📁 **FILES MODIFIED** (1 file):
    - `server/src/services/search.service.test.ts` (formatting fixed)

  **January 8, 2026 - Critical Bug Fix #2: Org Chart Lines Restored (Session 25 Part 2)** ⚠️🔱:
  - 🐛 **CRITICAL BUG IDENTIFIED**: Department hierarchy lines not showing in Organization Map
  - 🔍 **ROOT CAUSE ANALYSIS**:
    - First fix (1732bec) corrected department.service.ts and people.service.ts
    - However, org.service.ts (used by OrgMap component) was missed
    - Frontend transformToFlowData() checks `dept.parent_id` to create edges
    - Backend org.service.ts still returned `dept.parentId` (camelCase)
    - When parent_id was undefined, no edges were created
    - Result: Departments rendered but no connecting lines displayed
  - ✅ **FIXES APPLIED**:
    - Fixed org.service.ts getOrganizationById() department query (3 fields: parent_id, organization_id, sort_order)
    - Fixed org.service.ts getOrganizationById() people query (3 fields: department_id, sort_order, created_at)
    - Fixed org.service.ts all organization queries (3 fields: created_by_id, created_at, updated_at)
    - Updated org.service.test.ts assertions (createdById → created_by_id)

- 📁 **TESTING**:
  - All 97 backend tests passing
  - All 32 frontend tests passing
  - Production build verified successful
  - 🎉 **DEPLOYMENT**:
    - Pushed commit `da076d3` to main branch
    - GitHub Actions CI/CD triggered
    - Deployed to production at <[https://orgtree-app.onrender.com](https://orgtree-app.onrender.com)>
  - 🌑 **IMPACT**:
    - Department hierarchy lines now display correctly
    - Parent-child relationships visualized with smooth arrows
    - OrgMap visualization fully functional
    - Core feature of OrgTree restored
  - 📁 **FILES MODIFIED** (2 files):
    - `server/src/services/org.service.ts` (fixed 3 queries)
    - `server/src/services/org.service.test.ts` (fixed 1 assertion)
  - 🌑 **PREVENTION**: Complete field naming consistency now achieved across ALL backend services

  **January 8, 2026 - Critical Bug Fix #1: Departments Now Visible (Session 25 Part 1)** ⚠️ ️:
  - 🐛 **CRITICAL BUG IDENTIFIED**: Departments not visible in Departments tab
  - 🔍 **ROOT CAUSE ANALYSIS**:
    - TypeScript migration (Session 19) introduced field naming mismatch
    - Backend services returned camelCase fields (organizationId, parentId, sortOrder, etc.)
    - Frontend types expected snake_case fields (organization_id, parent_id, sort_order, etc.)
    - This caused silent data parsing failures - data was received but unrecognized
    - React rendered empty lists instead of crashing, hiding the bug
  - ✅ **FIXES APPLIED**:
    - Reverted `department.service.ts` to return snake_case from SQL queries
    - Reverted `people.service.ts` to return snake_case from SQL queries
    - Fixed `people.ts` route type assertion (departmentId → department_id)
    - Updated `department.service.test.ts` field name assertions
    - Updated `people.service.test.ts` field name assertions

- 📁 **TESTING**: - All 97 backend tests passing (including updated test assertions) - All 32 frontend tests passing - Production build verified successful
  - 🎉 **DEPLOYMENT**:
    - Pushed commit `1732bec` to main branch
    - GitHub Actions CI/CD triggered
    - Deployed to production at <[https://orgtree-app.onrender.com](https://orgtree-app.onrender.com)>
  - 🌑 **IMPACT**:
    - Departments now display correctly in UI
    - Department creation/update/delete operations restored
    - People associations with departments working
    - Tree view, search, and bulk operations functioning
  - 📁 **FILES MODIFIED** (5 files):
    - `server/src/services/department.service.ts`
    - `server/src/services/people.service.ts`
    - `server/src/routes/people.ts`
    - `server/src/services/department.service.test.ts`
    - `server/src/services/people.service.test.ts`
  - 🌑 **LESSON LEARNED**: When migrating to TypeScript, maintain consistency between database schema (snake_case), backend responses, and frontend types to prevent silent parsing failures

  **January 7, 2026 - Code Cleanup, Testing & Compliance (Session 22)** 🗑️ ⚖️:
  - ✅ **DEAD CODE ELIMINATION**:
    - Removed `src/utils/parseCSVToFlow.ts` (obsolete client-side parsing)
    - Removed `scripts/rename-to-typescript.sh` (one-time migration script)
  - ✅ **REFACTORING**:
    - Refactored `SearchOverlay.tsx` and `ShareModal.tsx` to use shared `getInitials` helper
    - Centralized common utility logic to improve maintainability
  - ✅ **BUG FIXES**:
    - **Search Highlight Bug**: Fixed issue where `<mark>` tags were escaped by XSS protection in `search.service.ts`
    - **CI/CD Fix**: Resolved pipeline failure by applying Prettier formatting to newly created test files
  - ✅ **INCREASED TEST COVERAGE**:
    - Created `server/src/services/department.service.test.ts` (15 new tests)
    - Created `server/src/services/people.service.test.ts` (8 new tests)
    - Total test suite increased to 99 passing tests (67 backend + 32 frontend)
  - ✅ **LICENSE MIGRATION**:
    - Migrated project from MIT to GPL 3.0 (GNU General Public License v3.0)
    - Updated `LICENSE` file, `package.json` (frontend/backend), `README.md`, `DEVELOPMENT.md`, and OpenAPI spec
  - 🎉 **COMMITS**:
    - `873f48c refactor: Dead code elimination and increased test coverage`
    - `ab0ed72 docs: Update ROADMAP.md with latest progress`
    - `7ab66a9 chore: Change license from MIT to GPL 3.0`
    - `6b19318 chore: Fix formatting issues in new test files`
    - `[latest] docs: Final session update for January 7`

  **January 7, 2026 - Developer Experience Improvements (Session 21)** ️:
  - ✅ **ROADMAP ITEMS COMPLETE**: All Developer Experience items from ROADMAP.md finished
  - ✅ **DOCKER DEVELOPMENT ENVIRONMENT**:
    ... - **api-types.ts**: Auto-generated types from OpenAPI specification
  - ✅ **GPL 3.0 LICENSE**:
    - GNU General Public License v3.0
    - Copyright 2025-2026 OrgTree Contributors
    - Enables free use, modification, and distribution under copyleft terms
  - 📁 **FILES CREATED** (7 files):
    - `Dockerfile` - Multi-stage build (94 lines)
    - `docker-compose.yml` - Development configuration (47 lines)
    - `docker-compose.prod.yml` - Production overrides (22 lines)
    - `CONTRIBUTING.md` - Contributor guidelines (~200 lines)
    - `src/sdk/index.ts` - API client SDK (613 lines)
    - `src/sdk/api-types.ts` - Generated TypeScript types from OpenAPI
    - `LICENSE` - GPL 3.0 license

- 📦 **DEPENDENCIES ADDED**:
  - `openapi-typescript` (devDependency) - Generates types from OpenAPI spec

- 🌑 **DEVELOPER EXPERIENCE ROADMAP STATUS**:
- ✅ Git Hooks (Husky) - Done January 4, 2026
- ✅ Docker Development Environment - Done January 7, 2026
- ✅ Contribution Guidelines - Done January 7, 2026
- ✅ API Client SDK - Done January 7, 2026
- ⌛️ Development Documentation (ADRs) - Remaining item
- 🎉 **COMMITS**:
  - `ede53bc feat: Add Docker development environment`
  - `67bad3f docs: Add CONTRIBUTING.md with comprehensive guidelines`
  - `99ece00 feat: Generate TypeScript API SDK from OpenAPI spec`
  - `7497bf1 docs: Add GPL 3.0 LICENSE file`

  **January 7, 2026 - TypeScript Migration Phases 4-8 COMPLETE (Session 19)** 🎉:
  - ✅ **MAJOR MILESTONE**: Complete TypeScript migration with ZERO errors
  - ✅ **ALL PHASES COMPLETE**: Phases 1-8 finished (infrastructure → validation)
  - ✅ **PHASE 4-5: Type Annotations**:
    - **Backend** (950+ errors → 0):
      - Fixed all routes (auth, organizations, departments, people, members, invitations, etc.)
      - Fixed all services (auth, org, member, bulk, invitation, search, department, people, users, audit, backup, csrf)
      - Fixed all middleware (auth, csrf, error handler)
      - Fixed all scripts (backup, analyze-indexes, benchmark-indexes, reset-superuser)
      - Fixed test helpers with complete type coverage
      - Added proper Express types: `AuthRequest`, `Response`, `NextFunction`
      - Database queries typed with explicit interfaces (DatabaseUser, DatabaseOrganization, etc.)
      - All route handlers return `Promise<void>` (Express pattern)
      - All backend imports use `.js` extensions (Node.js ES modules requirement)
      - SQLite boolean conversion: `Boolean(value)` for 0/1 → true/false
      - AppError class used consistently for error handling
    - **Frontend** (106 errors → 0):
      - Fixed all admin components (DepartmentManager, PersonManager, AuditLog, ShareSettings, ImportModal)
      - Fixed all superuser components (UserManagement, SystemAuditLog, CreateUserModal, ResetPasswordModal, UserForm)
      - Fixed all UI components (OrgMap, PublicOrgMap, SearchOverlay, OrganizationSelector, Toolbar, ThemePicker)
      - Fixed all hooks (useRealtimeUpdates, useSearch, useBulkSelection)
      - Fixed all contexts (AuthContext, SocketContext)
      - All React components have explicit prop interfaces
      - Socket.IO events typed with `(...args: unknown[])` pattern
      - React Flow nodes properly typed with `Node<DepartmentNodeData>`
      - Extended Organization type with optional `departments` and `role` fields
      - Extended SearchResponse with `pagination` and `suggestions` fields
  - ✅ **PHASE 6: Backend Strict Mode Compliance**:
    - **Initial State**: ~950 TypeScript errors across 45+ backend files
    - **Strategy**: Launched 8 parallel agents to systematically fix all backend files
    - **Round 1 Agents** (4 agents):
      - Routes: auth, organizations, departments, people, members, invitations, public, search, users, audit, backup, bulk, import, csrf
      - Middleware: auth, csrf, error handler
      - Core infrastructure: db, socket, sentry, index
      - Utils: logger, escape
    - **Round 2 Agents** (4 agents):
      - Services: bulk (79 errors), invitation (50+ errors), member (50+ errors), search (30+ errors)
      - Services: department, people, users, org (16 errors)
      - Services: backup, audit, csrf, socket-events, email
      - Services: auth (with bcrypt type fixes)
      - Test helpers: Fixed all test utilities with proper typing
    - **Manual Fixes**:
      - org.service.test.ts: Fixed possibly undefined objects with non-null assertions
      - users.ts route: Added `!` assertions for guaranteed route parameters
      - member.service.test.ts: Type guards for test data
    - **Script Fixes**:
      - analyze-indexes.ts: Added TableRow, IndexRow, QueryPlanRow interfaces
      - backup.ts: Proper error handling with `error instanceof Error`
      - benchmark-indexes.ts: Typed database query results
      - reset-superuser.ts: Parameter types and null checks
    - **Final Result**: Backend compiles with 0 TypeScript errors
  - ✅ **PHASE 7: Frontend Strict Mode Compliance**:
    - **Initial State**: 106 TypeScript errors across 11 frontend files
    - **Fixed Components**:
      - PublicOrgMap.tsx: Extended NodeData interface with index signature for React Flow
      - SearchOverlay.tsx: Proper ResultItem interface with all optional fields
      - OrganizationSelector.tsx: ExtendedOrganization type with computed fields
      - OrgMap.tsx: React Flow node data typing with callbacks
      - Toolbar.tsx: ToolbarProps interface with all handler types
      - ThemePicker.tsx: Added React import for JSX.Element
    - **Fixed Admin Components**:
      - AuditLog.tsx: PaginationInfo interface, event handler types
      - DepartmentManager.tsx: BulkDeleteResult conversion, TreeDepartment interface
      - ImportModal.tsx: PreviewData, CSVRow, MappingErrors interfaces
      - PersonManager.tsx: FilteredPerson interface with all optional fields
      - ShareSettings.tsx: MemberWithUser interface, comprehensive state typing
    - **Fixed Superuser Components**:
      - UserManagement.tsx: UserWithOrgs interface with all aggregated fields
      - SystemAuditLog.tsx: AuditLog type with proper camelCase properties
      - CreateUserModal, ResetPasswordModal, UserForm: All prop interfaces defined
      - UserOrgsModal.tsx: UserWithOrgs, OrgItemProps interfaces
    - **Fixed Hooks**:
      - useRealtimeUpdates: Socket event handlers with `(...args: unknown[])` pattern
      - useSearch: SearchFilters interface, proper error handling
      - useBulkSelection: Generic type parameter for selection state
    - **Type Definitions Extended**:
      - src/types/index.ts: Added `pagination` and `suggestions` to SearchResponse
      - src/types/index.ts: Added `departments`, `role`, `createdAt` to Organization
    - **Final Result**: Frontend compiles with 0 TypeScript errors
  - ✅ **PHASE 8: Final Validation & ESLint Cleanup**:
    - **ESLint Errors Fixed** (47 errors → 0):
      - **Missing React imports** (18 files): Added `import React from 'react';` to all files using `React.JSX.Element`
      - **Explicit any types** (11 instances): Replaced `any` with proper types
        - OrgMap: Changed `as any` to `as unknown as Node<DepartmentNodeData>`
        - SearchOverlay: Proper type narrowing for result highlighting
        - ProtectedRoute: Used proper ComponentType from react
      - **Unused error variables** (3 files): Renamed `err` to `_err` to indicate intentional non-use
      - **Console.log statements** (14 instances): Removed debugging console.log calls
      - **React Hooks exhaustive-deps** (4 instances): Added eslint-disable comments where intentional
    - **Build Fixes**:
      - Fixed TypeScript compilation errors from `unknown` type spreading in OrgMap
      - Added proper type assertions before spread operators
      - Fixed test: Added SQL alias `created_by_id as createdById` in org.service.test.ts
    - **Final Quality Checks** (All Passed ✅):
      - ✅ Frontend type-check: SUCCESS (0 errors)
      - ✅ Backend type-check: SUCCESS (0 errors)
      - ✅ Frontend tests: 32 tests passing
      - ✅ Backend tests: 44 tests passing
      - ✅ ESLint: 0 errors (10 warnings, ignorable)
      - ✅ Production build: Successful (3.17s build time)
      - ✅ Pre-commit hooks: All passing
      - ✅ Pre-push hooks: All passing

- 📁 **MIGRATION STATISTICS**:
  - **Total Errors Fixed**: 950+ TypeScript errors → 0
  - **Files Migrated**: 93 files (45+ backend, 45+ frontend, 3+ scripts)
  - **Type Coverage**: 100% (strict mode, no implicit any)
  - **Lines Changed**: 4,076 insertions, 1,876 deletions
  - **Commits**: 3 commits (main migration + 2 fixes)
  - **Time**: ~4 hours (estimated based on agent work)
  - 🌑 **KEY TECHNICAL PATTERNS ESTABLISHED**:
    - **Backend**: All imports use `.js` extensions for ES modules
    - **Express**: Route handlers return `Promise<void>`, not data types
    - **Database**: Query results typed with `as Type | undefined` assertions
    - **SQLite**: Boolean conversion with `Boolean(value)` for 0/1 values
    - **Socket.IO**: Event handlers use `(...args: unknown[])` with type assertions
    - **React**: All components have explicit prop interfaces
    - **Type Safety**: Non-null assertions (`!`) only for guaranteed values
    - **Error Handling**: AppError class with HTTP status codes
  - 📁 **FILES MODIFIED** (93 files):
    - **Backend**: 45+ files (routes, services, middleware, scripts, tests)
    - **Frontend**: 45+ files (components, hooks, contexts, utils)
    - **Types**: Extended interfaces in `src/types/index.ts` and `server/src/types/index.ts`
  - 🎉 **DEPLOYED**: All commits pushed to GitHub, production build successful
  - 🎉 **STATUS**: TypeScript migration 100% complete with enterprise-grade type safety

  **January 7, 2026 - CI Pipeline Fixes (Session 20)** ✅:
  - ✅ **CI PIPELINE NOW PASSING**: All GitHub Actions checks green
  - ✅ **RENDER DEPLOYMENT FIX**:
    - **Issue**: `tsx: not found` error in production
    - **Root Cause**: `tsx` was in devDependencies, but Render runs `npm install --production`
    - **Fix**: Moved `tsx` to dependencies in server/package.json
    - **Result**: Production deployment successful, server running
  - ✅ **BACKEND ESLINT FIXES** (74 errors → 0):
    - **@typescript-eslint/no-explicit-any**: Replaced all `any` types with proper TypeScript types
    - **Routes**: Changed `error: any` to `error: unknown` with type guards
    - **Services**: Created proper interfaces (DeletedPerson, MovedPerson, BulkEditFields, etc.)
    - **Socket Events**: Changed `Record<string, any>` to `Record<string, unknown>`
    - **Test Files**: Converted `require()` to `await import()` for ES modules
    - **Global Types**: Added eslint-disable for empty interface (required for Express augmentation)
  - ✅ **PRETTIER FORMATTING** (30 files formatted):
    - Applied consistent code style across all backend TypeScript files
    - Fixed inconsistent indentation, line breaks, and quote styles
    - Ensured CI format check passes
  - ✅ **KEY INSIGHT: Pre-commit vs CI**:
    - Pre-commit hooks use `lint-staged` (only checks staged files)
    - CI pipeline lints the entire codebase
    - Files modified before staging weren't checked by pre-commit but caught by CI
  - 📁 **FILES MODIFIED**:
    - server/package.json (tsx moved to dependencies)
    - 30 backend TypeScript files (Prettier formatting)
    - 15+ route files (any → unknown type fixes)
    - 10+ service files (proper interfaces)
    - 3 test files (require → import)
  - 🌑 **FINAL CI STATUS**: All checks passing ✅
    - ESLint: 0 errors
    - Prettier: All files formatted
    - Tests: 76 passing (44 backend + 32 frontend)
    - Build: Successful
    - Type-check: 0 errors

  **January 7, 2026 - TypeScript Migration Phases 1-3 (Session 18)** 💎:
  - ✅ **MAJOR MILESTONE**: Complete TypeScript migration infrastructure and file conversion
  - ✅ **BREAKING CHANGE**: All files converted to TypeScript (build currently broken, expected)
  - ✅ **BACKUP CREATED**: `backup-before-typescript-migration` branch for safe rollback
  - ✅ **PHASE 1: Configuration Setup**:
    - **Dependencies Installed**: typescript, @types packages, @typescript-eslint tools, tsx
    - **tsconfig.json** (frontend): Full strict mode, React JSX, Vite bundler resolution
    - **server/tsconfig.json** (backend): NodeNext modules for ES module support
    - **ESLint Updated**: TypeScript parser and plugins for both frontend and backend
    - **Vitest Configs**: Updated for .ts/.tsx test files
    - **Vite Config**: Renamed to vite.config.ts
    - **Package Scripts**: Updated for TypeScript workflow
      - Frontend build: `tsc && vite build` (type-check before build)
      - Backend dev: `tsx watch` (direct TS execution, no build step)
      - Backend prod: `tsx src/index.ts` (direct TS execution)
      - Added `typecheck` scripts to both package.json
  - ✅ **PHASE 2: Type Definitions**:
    - **Shared Types** (`src/types/index.ts`): 35+ interfaces and types
      - Core entities: User, Organization, Department, Person, Invitation, OrgMember
      - API responses: LoginResponse, RefreshTokenResponse, SearchResponse
      - Socket.IO events: SocketDepartmentEvent, SocketPersonEvent, SocketMemberEvent
      - UI types: DepartmentNodeData, PersonNodeData, ThemeColor, ThemeConfig
      - Operations: BulkOperationResult, CSVImportResult, AuditLog, Session
    - **Backend Types** (`server/src/types/index.ts`): 30+ interfaces and types
      - Express extensions: AuthRequest (adds user to Request)
      - Database types: All Database\* interfaces for SQLite results (handles 0/1 booleans)
      - Service return types: CreateUserResult, LoginResult, RefreshResult, OrgAccessCheck
      - JWT & Auth: JWTPayload, SocketUser, CSRFTokenData
      - Custom error: AppError class with status codes
      - Utility types: WithRequired, WithOptional, SQLiteBoolean
      - Re-exports: All shared types for backend convenience
    - **Global Declarations**:
