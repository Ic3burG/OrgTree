# GEMINI.md — OrgTree Project Instructions for Gemini

This file provides project-specific instructions for Gemini when working in this repository.

## Project Overview

OrgTree is a full-stack organizational directory and visualization platform. Monorepo structure:

- **Frontend**: Root directory (React + Vite + TypeScript + Tailwind CSS v4)
- **Backend**: `server/` directory (Node.js + Express + SQLite)

## ⚠️ MANDATORY: Code Formatting Before Every Commit

**This is the most critical requirement. CI will fail if violated.**

A `pre-push` git hook enforces Prettier formatting across the entire monorepo. If code is not formatted, the push will be blocked and CI will fail.

**Before staging ANY files for commit, you MUST run:**

```bash
npm run format
```

This formats all frontend files (`src/`, docs, config) AND the backend (`server/`). Run it from the root — it covers everything.

**Correct workflow — follow this exactly:**

```bash
# 1. Make your changes
# 2. Format BEFORE staging
npm run format

# 3. Lint check
npm run lint:all

# 4. Fix lint errors if any
npm run lint:fix

# 5. Run tests
npm run test:all

# 6. Stage and commit with a detailed message
git add <files>
git commit -m "type(scope): detailed description"

# 7. Push (pre-push hook will double-check formatting + run tests + build)
git push
```

**NEVER skip step 2.** The pre-push hook will catch it, but that blocks the workflow unnecessarily.

## Common Commands

```bash
# Development
npm run dev                    # Frontend dev server (localhost:3000)
cd server && npm run dev       # Backend dev server (localhost:3001)

# Testing
npm test                       # Frontend tests only
npm run test:all               # Frontend + backend tests
cd server && npm test          # Backend tests only

# Linting
npm run lint:all               # Lint frontend and backend
npm run lint:fix               # Auto-fix ESLint issues (frontend)

# Formatting
npm run format                 # Format ALL files (run this before every commit)
npm run format:check           # Check formatting without fixing

# Build
npm run build                  # Build frontend for production
```

## Commit Message Requirements

All commits must follow the Conventional Commits format. See `.gemini/COMMIT_GUIDELINES.md` for the full spec.

```
<type>(<scope>): <subject>

<body explaining WHY and WHAT changed>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Every commit body MUST list ALL significant changes. Vague messages like "fix bugs" are rejected.

## Architecture Notes

- **Database**: SQLite via `better-sqlite3`, schema in `server/src/db.ts`
- **Auth**: JWT dual-token (15min access / 7d refresh) + WebAuthn passkeys + TOTP 2FA
- **Real-time**: Socket.IO with org-scoped rooms
- **Search**: FTS5 full-text search with trigram fallback
- **Styling**: Tailwind CSS v4 — use `@import 'tailwindcss'` syntax, NOT `@tailwind` directives
- **Mobile breakpoint**: `lg:` (1024px) throughout

## Pre-Push Hook Enforcement

The `.husky/pre-push` hook runs automatically on every `git push` and checks:

1. Prettier formatting (entire monorepo)
2. Full test suite (frontend + backend)
3. TypeScript build

If your push is blocked, run `npm run format` and fix any test failures before retrying.

**Never use `--no-verify` to bypass hooks.** This will cause CI failures.
