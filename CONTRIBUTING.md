# Contributing to OrgTree

Thank you for your interest in contributing to OrgTree! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Guidelines](#commit-guidelines)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together.

---

## Getting Started

### Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm** (comes with Node.js)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/OrgTree.git
   cd OrgTree
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Ic3burG/OrgTree.git
   ```

---

## Development Setup

### Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### Environment Configuration

1. Copy the example environment file:

   ```bash
   cp server/.env.example server/.env
   ```

2. Required environment variables:
   ```env
   JWT_SECRET=your-secret-key-here
   NODE_ENV=development
   ```

### Start Development Servers

```bash
# Terminal 1: Frontend (http://localhost:5173)
npm run dev

# Terminal 2: Backend (http://localhost:3001)
cd server && npm run dev
```

The frontend proxies API requests to the backend automatically.

---

## Project Structure

```
OrgTree/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React components
│   │   ├── admin/          # Admin dashboard components
│   │   ├── auth/           # Authentication components
│   │   ├── superuser/      # System admin components
│   │   └── ui/             # Reusable UI components
│   ├── contexts/           # React contexts (Auth, Socket)
│   ├── hooks/              # Custom React hooks
│   ├── api/                # API client
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── server/                 # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── services/       # Business logic layer
│   │   ├── middleware/     # Express middleware
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   └── scripts/            # Database scripts, backups
├── dist/                   # Production build output
└── docs/                   # Additional documentation
```

### Key Files

| File                  | Purpose                             |
| --------------------- | ----------------------------------- |
| `src/api/client.ts`   | API client with auth token handling |
| `server/src/db.ts`    | Database schema and migrations      |
| `server/src/index.ts` | Express app setup                   |
| `vite.config.ts`      | Frontend build configuration        |

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, typed TypeScript code
- Follow existing patterns in the codebase
- Add tests for new functionality

### 3. Run Quality Checks

```bash
# Type checking
npm run typecheck
cd server && npm run typecheck && cd ..

# Linting
npm run lint
cd server && npm run lint && cd ..

# Formatting
npm run format
cd server && npm run format && cd ..

# Tests
npm run test:all
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

---

## Code Standards

### TypeScript

- **Strict mode enabled** - No implicit `any` types
- **Explicit return types** on all functions
- **Interfaces for props** on all React components
- **Type assertions** only when necessary (prefer type guards)

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps): React.JSX.Element {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// Avoid
function Button(props: any) { ... }
```

### Backend Patterns

- **Service layer** for business logic (not in routes)
- **Route handlers** return `Promise<void>` (Express pattern)
- **Imports use `.js` extension** (Node.js ES modules)
- **Database queries typed** with explicit interfaces

```typescript
// Good - service function
export function createDepartment(orgId: string, data: CreateDepartmentData): Department {
  // Business logic here
}

// Good - route handler
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = createDepartment(req.params.orgId, req.body);
  res.status(201).json(result);
});
```

### Frontend Patterns

- **Functional components** with hooks
- **Context API** for global state (Auth, Socket)
- **Direct API calls** in components (no Redux)

### Styling

- **Tailwind CSS** for styling
- **No inline styles** unless dynamic
- **Consistent spacing** using Tailwind utilities

---

## Testing

### Running Tests

```bash
# All tests (frontend + backend)
npm run test:all

# Frontend only
npm test

# Backend only
cd server && npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

- **Colocate tests** with source files (`*.test.ts` next to `*.ts`)
- **Use Vitest** for testing framework
- **Mock external dependencies** (database, API calls)

```typescript
// Example test
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### E2E Testing with Playwright

End-to-end tests run in real browsers to test complete user flows.

```bash
# Start dev servers first (required)
npm run dev                    # Terminal 1: Frontend
cd server && npm run dev       # Terminal 2: Backend

# Run E2E tests
npm run test:e2e              # Run all E2E tests
npm run test:e2e:chromium     # Run in Chromium only
npm run test:e2e:ui           # Run with interactive UI
npm run test:e2e:debug        # Run in debug mode
```

E2E tests are located in the `e2e/` directory and cover:

- **Authentication** (login, signup, logout)
- **Organizations** (create, navigate, manage)
- **Departments** (CRUD operations)
- **People** (CRUD, bulk operations)
- **Public Sharing** (enable/disable, anonymous access)

---

## Pull Request Process

### Before Submitting

1. **Ensure all checks pass locally:**

   ```bash
   npm run typecheck && cd server && npm run typecheck && cd ..
   npm run lint:all
   npm run test:all
   npm run build
   ```

2. **Update documentation** if needed (README, CLAUDE.md, etc.)

3. **Write a clear PR description** explaining:
   - What changes were made
   - Why they were needed
   - How to test them

### PR Requirements

- [ ] All CI checks pass (lint, test, build, typecheck)
- [ ] No merge conflicts with `main`
- [ ] Code follows project conventions
- [ ] Tests added for new functionality
- [ ] Documentation updated if applicable

### Review Process

1. Submit PR against `main` branch
2. Wait for CI checks to pass
3. Address reviewer feedback
4. Squash and merge when approved

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                             |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `docs`     | Documentation only                      |
| `style`    | Formatting, no code change              |
| `refactor` | Code change that neither fixes nor adds |
| `perf`     | Performance improvement                 |
| `test`     | Adding or updating tests                |
| `chore`    | Maintenance tasks                       |

### Examples

```bash
feat(auth): add password reset functionality
fix(api): handle null response in department query
docs: update contributing guidelines
perf: implement code splitting for vendor chunks
test(bulk): add tests for bulk delete operation
```

---

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/Ic3burG/OrgTree/discussions)
- **Found a bug?** Open a [GitHub Issue](https://github.com/Ic3burG/OrgTree/issues)
- **API Documentation:** Available at `/api/docs` when server is running

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to OrgTree! 🎉
