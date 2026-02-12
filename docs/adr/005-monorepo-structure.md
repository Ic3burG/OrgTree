# ADR-005: Monorepo Structure

**Status**: Accepted
**Date**: 2025-12-15
**Deciders**: Development Team
**Tags**: architecture, project-structure, monorepo

## Context and Problem Statement

OrgTree consists of a React frontend and Node.js backend that are tightly coupled (same deployment, shared types, coordinated releases). The project structure needs to balance separation of concerns with ease of development and deployment.

## Decision Drivers

- **Developer experience**: Simple local setup without complex tooling
- **Deployment simplicity**: Single build process for frontend + backend
- **Code sharing**: Share TypeScript types and constants between frontend/backend
- **Independent dependencies**: Frontend and backend have different npm packages
- **Version control**: Track related changes in a single commit
- **CI/CD**: Simple build and test pipeline
- **Scalability**: Support future growth without major restructuring

## Considered Options

- **Simple monorepo** (frontend at root, backend in `server/`)
- Polyrepo (separate Git repositories for frontend and backend)
- Full monorepo tooling (Nx, Turborepo, Lerna)
- Backend-at-root, frontend in `client/`

## Decision Outcome

Chosen option: **Simple monorepo with frontend at root**, because it provides the best balance of simplicity and developer experience for OrgTree's size and deployment model (Express serves built frontend).

### Directory Structure

```texttext

OrgTree/
├── src/                      # Frontend React code
│   ├── components/
│   ├── contexts/
│   ├── api/
│   └── ...
├── server/                   # Backend Node.js code
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   ├── scripts/
│   ├── package.json          # Backend dependencies
│   └── database.db           # SQLite database
├── public/                   # Frontend static assets
├── dist/                     # Built frontend (after `npm run build`)
├── docs/                     # Documentation including ADRs
├── package.json              # Frontend dependencies + scripts
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # Frontend TypeScript config
└── docker-compose.yml        # Development environment

```

### Build and Deployment Process

**Development**:

```bash

# Terminal 1: Frontend dev server (port 3000)
npm run dev

# Terminal 2: Backend dev server (port 3001)
cd server && npm run dev

```

**Production**:

```bash

# Build frontend to dist/
npm run build

# Express serves dist/ at root
cd server && npm start

```

### Positive Consequences

- **Simple setup**: `npm install` + `cd server && npm install` (no workspace tools)
- **Clear separation**: Frontend and backend have distinct `package.json` files
- **Natural deployment**: Backend serves built frontend (single deployable unit)
- **Independent scripts**: Can run frontend or backend tests separately
- **Shared types**: Can export/import types between src/ and server/src/ (TypeScript path aliases)
- **Single repository**: Related changes committed together (e.g., API contract changes)
- **CI/CD simplicity**: Single GitHub Actions workflow for both

### Negative Consequences

- **Duplicate dependencies**: Some packages (TypeScript, ESLint) installed in both root and server/
- **Manual coordination**: Must remember to `npm install` in both locations
- **No automatic workspace linking**: Cannot directly import from `../server/src` without build step
- **Build ordering**: Must build frontend before starting production backend

## Pros and Cons of the Options

### Simple Monorepo (Chosen)

- **Good**, because minimal tooling overhead (no Nx, Turborepo complexity)
- **Good**, because natural for Express serving frontend (dist/ served by server)
- **Good**, because separate package.json allows independent dependency versions
- **Good**, because easy to understand for new developers
- **Good**, because works well with existing deployment platforms (Render, Heroku)
- **Bad**, because must manually run `npm install` in two places
- **Bad**, because some duplicate dependencies (TypeScript, linting tools)
- **Bad**, because no automatic task orchestration (must run dev servers separately)

### Polyrepo (Separate Repositories)

- **Good**, because complete independence (separate CI/CD, deployment)
- **Good**, because clearer ownership boundaries
- **Good**, because can use different languages/frameworks easily
- **Bad**, because coordinating changes across repos is painful (sync issues)
- **Bad**, because cannot commit frontend + backend changes atomically
- **Bad**, because harder to share types and constants
- **Bad**, because more complex deployment (two separate deploys to coordinate)
- **Bad**, because duplicate documentation, tooling setup, CI/CD config

### Full Monorepo Tooling (Nx, Turborepo, Lerna)

- **Good**, because automatic workspace management
- **Good**, because task orchestration and caching
- **Good**, because can share code as internal packages
- **Good**, because parallel builds and tests
- **Bad**, because significant complexity for small project
- **Bad**, because learning curve for new developers
- **Bad**, because adds dependencies (Nx: 50+ packages)
- **Bad**, because opinionated project structure
- **Bad**, because overkill for 2-project monorepo

### Backend-at-Root, Frontend in `client/`

- **Good**, because backend-first approach (API is core)
- **Good**, because npm root commands run backend by default
- **Bad**, because deployment is awkward (must build client, copy to backend)
- **Bad**, because frontend feels like secondary citizen
- **Bad**, because Vite config expects root-level setup
- **Bad**, because GitHub shows backend files first (less welcoming for frontend devs)

## Type Sharing Strategy

**Current approach**: Copy types manually

- Frontend defines types in `src/types/`
- Backend defines types in `server/src/types/`
- OpenAPI spec generates shared types via `src/sdk/api-types.ts`

**Future improvement**: TypeScript project references

```json
// server/tsconfig.json
{
  "references": [{ "path": "../" }]
}
```

This would allow importing types directly:

```typescript
import type { Department } from '../../src/types/models';
```

**Alternative considered**: Extract shared types to `packages/types/`

- **Rejected**: Adds complexity for minimal benefit (only ~10 shared types)

## Dependency Management

**Duplicate dependencies** (intentional):

- `typescript`: Different versions allowed (frontend: 5.7, backend: 5.6)
- `eslint`: Different configs (frontend: React rules, backend: Node rules)
- `prettier`: Shared config via root `.prettierrc`
- `vitest`: Different test setups (frontend: jsdom, backend: node)

**Shared via root**:

- Husky git hooks (pre-commit linting)
- Prettier configuration
- Docker Compose setup
- Documentation

## CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):

```yaml
- name: Install dependencies
  run: |
    npm ci
    cd server && npm ci

- name: Lint
  run: |
    npm run lint
    cd server && npm run lint

- name: Test
  run: |
    npm test
    cd server && npm test

- name: Build
  run: npm run build
```

Simple sequential execution (no workspace orchestration needed).

## Deployment Configuration

**Render.com**:

```yaml
# render.yaml
services:
  - type: web
    name: orgtree
    buildCommand: npm install && npm run build && cd server && npm install
    startCommand: cd server && npm start
```

Single service deploys both frontend and backend.

## Migration Path

If OrgTree grows to need full monorepo tooling:

1. **Add Turborepo**: Minimal config, keeps existing structure
2. **Convert to pnpm workspaces**: Reduce duplicate dependencies
3. **Split into packages/**: Extract shared types, utilities, components

Migration would be incremental and non-breaking.

## Project Size Context

**Current scale** (why simple monorepo is sufficient):

- 2 projects (frontend, backend)
- ~100 source files total
- 2-5 active developers
- Single deployment target
- Coordinated releases (frontend + backend versioned together)

**When to migrate** to full monorepo tooling:

- 5+ internal packages
- 10+ active developers
- Multiple deployment targets
- Significant build time issues (>5 minutes)
- Independent versioning needs

## Links

- [Monorepo vs Polyrepo](https://monorepo.tools/)
- [Simple Monorepo with npm and TypeScript](https://earthly.dev/blog/setup-typescript-monorepo/)
- Related: `package.json` (frontend scripts)
- Related: `server/package.json` (backend scripts)
- Related: `docker-compose.yml` (development environment)
