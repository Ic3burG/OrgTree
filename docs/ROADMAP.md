# OrgTree Development Roadmap

> **Last Updated**: January 25, 2026
> **Status**: Production-ready with ongoing enhancements

This document outlines the development roadmap for OrgTree, including technical debt items, feature enhancements, and infrastructure improvements.

---

## 🔧 Technical Debt Roadmap

### Code Quality & Testing

- [x] **TypeScript Migration** - Convert codebase from JavaScript to TypeScript for better type safety ✅ **DONE** (January 7, 2026)
- [x] **Increase Test Coverage** - Expand from 210 tests to cover edge cases and integration scenarios (target: >80% coverage) ✅ **DONE** (January 28, 2026) - (Total: ~945 tests - Backend: >80% coverage; Frontend: 232 tests)
- [x] **E2E Testing** - Add end-to-end tests with Playwright or Cypress for critical user flows ✅ **DONE** (January 11, 2026)
- [x] **ESLint/Prettier Setup** - Enforce code style consistency across the team ✅ **DONE** (January 4, 2026)
- [x] **Component Refactoring** - Break down large components (DepartmentManager, PersonManager) into smaller, reusable pieces ✅ **DONE** (January 11, 2026)
- [ ] **Storybook Integration** - Document UI components with interactive examples
- [x] **Search System Rebuild** - SQLite FTS5 based search with maintenance triggers (see [docs/adr/017-search-system-rebuild.md](adr/017-search-system-rebuild.md)) ✅ **DONE** (January 24, 2026)

### Performance Optimization

- [x] **Database Indexing Audit** - Review and optimize indexes for frequently-queried fields ✅ **DONE** (January 5, 2026)
- [x] **Frontend Bundle Optimization** - Code splitting, lazy loading, tree shaking analysis ✅ **DONE** (January 7, 2026)
- [x] **Performance Testing** - Load testing with larger datasets (1000+ records) ✅ **DONE** (January 11, 2026)
- [ ] **Query Profiling** - Profile slow database queries and optimize (especially for large orgs)
- [x] **React Performance Audit** - Review unnecessary re-renders, missing memoization ✅ **DONE** (January 11, 2026)
- [ ] **List Virtualization** - Implement `react-window` or similar for ultra-large (>5000) lists
- [ ] **Image Optimization Pipeline** - Compress and optimize profile pictures/assets
- [ ] **Service Workers** - Add offline capability and asset caching (PWA)

### Security Hardening

- [x] **Address Medium/Low Severity Items** - Complete remaining items from SECURITY_AUDIT.md ✅ **DONE** (January 4, 2026) - All 25 items resolved
- [x] **CSRF Protection** - Add CSRF tokens for state-changing operations ✅ **DONE** (December 31, 2025)
- [x] **Dependency Scanning Automation** - GitHub Dependabot or Snyk integration ✅ **DONE** (January 8, 2026)
- [ ] **Penetration Testing** - Professional security assessment
- [x] **SQL Injection Testing** - Automated scanning for SQL injection vulnerabilities ✅ **DONE** (January 11, 2026)
- [x] **Content Security Policy Tuning** - Refine CSP headers for tighter security ✅ **DONE** (January 11, 2026)

### Infrastructure & DevOps

- [x] **Database Backup Strategy** - Automated daily backups with retention policy ✅ **DONE** (January 4, 2026)
- [x] **Monitoring & Alerting** - Sentry for error tracking ✅ **DONE** (January 4, 2026)
- [ ] **APM (Application Performance Monitoring)** - New Relic, DataDog, or similar
- [x] **CI/CD Pipeline** - GitHub Actions for automated testing and deployment ✅ **DONE** (January 5, 2026)
- [x] **Database Migration Rollback** - Strategy and scripts for safe rollbacks (see [docs/adr/012-database-migration-rollback.md](adr/012-database-migration-rollback.md)) ✅ **DONE** (January 25, 2026)
- [x] **Health Check Enhancement** - Add memory usage, disk space, connection pool metrics ✅ **DONE** (January 8, 2026)

### Long-term Infrastructure Goals

- [ ] **Re-implement Staging Environment** - Separate staging server for pre-production testing (Temporarily suspended to conserve pipeline minutes)


### Scalability & Architecture

- [x] **Database Connection Pooling** - Better-sqlite3 optimization for concurrent requests ✅ **DONE** (January 11, 2026)
- [ ] **PostgreSQL Migration Path** - Research migration from SQLite for better concurrency at scale
- [ ] **Caching Layer** - Redis for session storage, frequently-accessed data
- [ ] **Background Jobs** - Bull/BullMQ for async tasks (email sending, large imports)
- [ ] **File Upload Storage** - S3/Cloudinary for profile pictures and attachments
- [ ] **Horizontal Scaling Strategy** - Document approach for multi-instance deployment

### Developer Experience

- [x] **Git Hooks** - Husky for pre-commit linting, pre-push testing ✅ **DONE** (January 4, 2026)
- [x] **Docker Development Environment** - docker-compose for consistent local setup ✅ **DONE** (January 7, 2026)
- [x] **Contribution Guidelines** - CONTRIBUTING.md with setup, PR process, code standards ✅ **DONE** (January 7, 2026)
- [x] **API Client SDK** - Generate JavaScript/TypeScript SDK from OpenAPI spec ✅ **DONE** (January 7, 2026)
- [x] **Development Documentation** - Architecture decision records (ADRs) ✅ **DONE** (January 7, 2026)

### Observability & Analytics

- [x] **Sentry Express Instrumentation** - Improve Sentry setup with `--import` flag for early initialization and automatic Express tracking ✅ **DONE** (January 8, 2026)
- [x] **Application Metrics Dashboard** - Response times, error rates, active users ✅ **DONE** (January 21, 2026)
- [x] **User Analytics** - Track feature usage, user journeys (privacy-respecting) ✅ **DONE** (January 21, 2026)
- [ ] **Log Aggregation** - Centralized logging with search (Loki, CloudWatch, etc.)
- [ ] **Performance Budget** - Set and monitor bundle size, load time thresholds

### Code Cleanup & Modernization

- [x] **Dependency Audit** - Remove unused dependencies, update outdated packages ✅ **DONE** (January 6, 2026)
- [x] **Dead Code Elimination** - Remove unused components, functions, routes ✅ **DONE** (January 7, 2026)
- [x] **CSS Optimization** - Purge unused Tailwind classes, optimize bundle size ✅ **DONE** (January 8, 2026)
- [ ] **API Versioning Strategy** - Plan for backward-compatible API changes
- [x] **Accessibility Audit** - WCAG 2.1 AA compliance review and fixes ✅ **DONE** (January 11, 2026)

---

## 📊 Priority Recommendations

### High Priority (Next 1-2 weeks)

1. ~~**Database Backup Strategy** - Critical for production data safety~~ ✅ **DONE**
2. ~~**Monitoring & Alerting** - Sentry for error tracking and uptime monitoring~~ ✅ **DONE**
3. ~~**Git Hooks** - Prevent bugs from being committed~~ ✅ **DONE**
4. ~~**Address Medium Security Items** - Complete remaining SECURITY_AUDIT.md items~~ ✅ **DONE**
5. ~~**Search System Rebuild** - Rebuild FTS5 search from the ground up to fix sync issues, improve error handling, and add monitoring~~ ✅ **DONE**

### Medium Priority (Next month)

1. **Increase Test Coverage** - Improve test coverage beyond current 210 tests (Backend: ~73%, Frontend: ~36%)
2. ~~**Database Indexing Audit** - Optimize query performance~~ ✅ **DONE** (January 5, 2026)
3. ~~**CI/CD Pipeline** - Automate testing and deployment~~ ✅ **DONE** (January 5, 2026)
4. ~~**ESLint/Prettier Setup** - Enforce code consistency~~ ✅ **DONE**

🎉 **All Medium Priority Items Complete!**

### Low Priority (Next quarter)

1. ~~**TypeScript Migration** - Long-term type safety improvement~~ ✅ **DONE** (January 7, 2026)
2. **E2E Testing** - Comprehensive user flow testing
3. **PostgreSQL Migration Path** - Research for future scalability
4. **Caching Layer** - Performance optimization for high traffic

🎉 **TypeScript Migration Complete!** Full strict mode with 0 errors.

---

## 📋 Feature Roadmap

### Immediate Priorities (Next 1-2 weeks)

1. ~~**Testing & QA** - Comprehensive testing of all features~~ ✅ **DONE** (December 30, 2025) - Vitest with 76 tests
2. ~~**Documentation** - User guides and admin documentation~~ ✅ **DONE** (December 29, 2025) - See [DOCUMENTATION.md](DOCUMENTATION.md)
3. ~~**Deployment Prep** - Production environment setup~~ ✅ **DONE** (December 21, 2025)
4. **Performance Testing** - Load testing with larger datasets

### Short-term Goals (Next month)

1. ~~**Advanced Search** - Implement full-text search capabilities~~ ✅ **DONE** (December 28, 2025)
2. ~~**Bulk Operations** - Multi-select functionality for efficiency~~ ✅ **DONE** (December 29, 2025)
3. ~~**Custom Fields** - Allow configurable person/department attributes~~ ✅ **DONE** (January 15, 2026)
4. ~~**API Documentation** - Complete REST API documentation~~ ✅ **DONE** (December 30, 2025)
5. ~~**Dark Mode** - Add dark theme support with user preference persistence~~ ✅ **DONE** (January 9, 2026)
6. ~~**Inline Editing on Org Map** - Quick edit person details directly on person cards without opening full modal~~ ✅ **DONE** (January 22, 2026)
7. ~~**Organizational Hierarchy Display** - Show complete reporting chain in person details with clickable breadcrumb navigation~~ ✅ **DONE** (January 22, 2026)
8. ~~**Centered Vertical Layout** - Center the root department horizontally in vertical (TB) layout for better visual balance~~ ✅ **DONE** (January 22, 2026)
9. ~~**Remove Logout Button from Org Map** - Clean up legacy logout button from toolbar~~ ✅ **DONE** (January 22, 2026)
10. ~~**Persistent Org Map Settings** - Save theme, zoom, positions, and expanded state per-organization with reset button~~ ✅ **DONE** (January 22, 2026)
11. ~~**Rainbow Color Theme** - Add vibrant rainbow color theme cycling through spectrum by depth~~ ✅ **DONE** (January 22, 2026)
12. **Social Authentication** - Sign in with Google and Sign in with Apple (OAuth integration)
13. **Bulk Invitations** - Send invitations to multiple emails at once
14. **Invitation Enhancements** - Resend expired invitations, custom expiry periods, reminder emails
15. **GEDS URL Import** - Automated download, parse, and import from GEDS download URLs (see [docs/adr/016-geds-url-import.md](adr/016-geds-url-import.md))

16. ~~**User Discovery & Privacy Controls** - Autocomplete existing users when sharing organizations, with a privacy opt-out in security settings~~ ✅ **DONE** (January 25, 2026)

### Medium-term Vision (Next quarter)

1. ~~**Team Collaboration** - Multi-user organization management~~ ✅ **DONE** (December 22-23, 2025)
2. ~~**Advanced Permissions** - Role-based access control~~ ✅ **DONE** (December 22, 2025)
3. **Integration APIs** - RESTful API for third-party integrations (API Extensions)
4. **Analytics Dashboard** - Organizational insights and reporting
5. **LDAP/AD Integration** - Import from existing directory services
6. **SSO Support** - SAML integration for enterprise
7. **Webhook Support** - External system notifications
8. **Hierarchical Tree Selector Component** - Replace native selects with interactive, collapsible tree dropdowns for department selection (improved UX with search, expand/collapse, keyboard navigation)
9. ~~**Department Hierarchy Highlighting** - Visual highlighting of ancestor departments on hover/click in Org Map~~ ✅ **DONE** (January 22, 2026)
10. **Advanced Sidebar UI Enhancements** (see [docs/rfc/advanced-sidebar-ui.md](rfc/advanced-sidebar-ui.md)):

- Multi-level collapse (Icon-only → Minimized → Hidden)
- Resizable sidebar with drag handle for custom width
- Floating action button for quick access when fully hidden
- Workspace layout presets (save/load layout configurations)
- Sidebar pinning (auto-hide on route change unless pinned)

1. ~~**Search Enhancements** (see [docs/adr/019-trigram-search-enhancements.md](adr/019-trigram-search-enhancements.md))~~ ✅ **DONE** (January 27, 2026):
   1. ~~**Typo Tolerance** - Trigram-based fuzzy matching~~ ✅ **DONE**
   1. ~~**Search Analytics** - Track zero-result searches to identify gaps~~ ✅ **DONE**
   1. ~~**Saved Searches** - Allow users to save frequently-used queries~~ ✅ **DONE**
   1. **Search Suggestions** - "Did you mean?" suggestions for misspellings (Partially covered by fuzzy match fallback)

---

## 🎯 Current Focus

**Active Work**:

- ~~Increasing test coverage (currently 929 tests: 697 Backend, 232 Frontend)~~ ✅ **DONE** (Backend near goal at 73%, Frontend ongoing at 36%)
- Performance optimization for large organizations
- User experience refinements

**Recently Completed** (January 2026):

- ✅ **Search Enhancements** - Trigram fuzzy matching, analytics, and saved searches (January 27, 2026)
- ✅ **Search System Rebuild** - Fixed FTS5 sync, soft-deletes, error handling, and added frontend resilience (January 24, 2026)
- ✅ **User Discovery & Privacy Controls** - Implemented discoverable user search with opt-out settings and autocomplete (January 25, 2026)
- ✅ **Database Migration Rollback** - Comprehensive migration system with auto-rollback in CD (January 25, 2026)
- ✅ **Department Hierarchy Highlighting** - Visual highlighting of ancestor departments on hover/click in Org Map (January 22, 2026)
- ✅ **Centered Vertical Layout** - Balanced organizational structure (January 22, 2026)
- ✅ **Rainbow Color Theme** - Vibrant depth-based coloring (January 22, 2026)

- ✅ **Inline Editing** - Edit person details directly on the Org Map (January 22, 2026)
- ✅ **Hierarchy Display** - Breadcrumb navigation for department structure (January 22, 2026)
- ✅ **Persistent Settings** - Saved view preferences for Org Map (January 22, 2026)
- ✅ **UI Cleanup** - Removed redundant logout button from toolbar (January 22, 2026)
- ✅ **User Analytics** - Privacy-respecting tracking of feature usage and user journeys (January 21, 2026)
- ✅ **Custom Fields System** - Organization-scoped custom fields with FTS5 search integration (January 15, 2026)
- ✅ **Star/Favorite People** - Mark key individuals with starred filter in search (January 14, 2026)
- ✅ **Collapsible Admin Sidebar** - Icon-only mode with localStorage persistence (January 13, 2026)
- ✅ **Dark Mode Refinements** - Applied to org map, MiniMap, and all components (January 12, 2026)
- ~~✅ **Staging Environment** - develop→staging, main→production pipeline with workflow_run trigger (January 21, 2026)~~ (Suspended Jan 28, 2026)
- ✅ **Test Coverage Expansion** - 929 tests total (January 25, 2026)
- ✅ **Performance Testing** - Successfully tested 1000+ records with 467ms load time (January 11, 2026)
- ✅ **E2E Testing** - Playwright tests for critical user flows (January 11, 2026)
- ✅ **TypeScript Migration** - Full strict mode compilation (January 7, 2026)
- ✅ **Developer Experience** - Docker, CONTRIBUTING.md, API SDK, ADRs (January 7, 2026)
- ✅ **CI/CD Pipeline** - GitHub Actions with automated testing and deployment
- ✅ **Sentry Integration** - Error monitoring with Express instrumentation
- ✅ **Database Optimization** - WAL mode, indexing, connection pooling

**Production Status**: 🚀 Live at <https://orgtree-app.onrender.com>

---

## 📝 Notes

- This roadmap is updated regularly as priorities shift
- Items marked ✅ **DONE** include completion dates
- High/Medium/Low priorities are reassessed monthly
- Feature requests from users may be added to this roadmap
- See [PROGRESS.md](../PROGRESS.md) for detailed session-by-session progress

**Maintainers**: Claude Code + Development Team
**Repository**: <https://github.com/Ic3burG/OrgTree>
