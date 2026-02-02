# Development Guide

## Quick Start

```bash

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

```

## Project Architecture

### Component Hierarchy

```texttext

Directory (main container)
├── SearchBar
├── Breadcrumbs
├── DepartmentCard (recursive)
│   ├── DepartmentCard (nested departments)
│   └── PersonCard
│       └── ContactIcons
└── DetailPanel

```

### Package Management & Build System

**Architecture**: Multi-Package Repository (NOT a monorepo)

This project uses a **multi-package structure** with independent frontend and backend packages, not NPM workspaces. This is an important architectural decision:

**Why No Workspaces?**

- **Independent Dependencies**: Frontend and backend have completely separate dependency trees
- **Separate Lockfiles**: Each package maintains its own `package-lock.json`
- **Isolated Builds**: CI runs `npm ci` independently in each directory
- **No Hoisting**: Dependencies stay in their respective `node_modules` directories

**When to Use Workspaces vs. Multi-Package:**

Use NPM Workspaces when:

- Dependencies should be hoisted to a single root `node_modules`
- Cross-package references use `workspace:` protocol
- All packages share a single lockfile
- Packages need to reference each other during development

Use Multi-Package (like OrgTree) when:

- Frontend and backend are truly independent services
- Each package has distinct dependency requirements
- Packages deploy separately (frontend to CDN, backend to server)
- No cross-package imports or shared code

**Common Pitfall**: Adding `"workspaces"` configuration to a multi-package repo can cause dependency resolution errors in CI because it tries to hoist dependencies that should remain isolated (like ESLint plugins or framework-specific tools).

**Testing Both Packages:**

```bash

# Run all tests (frontend + backend)
npm run test:all    # Runs: npm test && cd server && npm test

# Run all linters
npm run lint:all    # Runs: npm run lint && cd server && npm run lint

```

### State Management

The `Directory` component manages all application state:

- `treeData`: Parsed organization hierarchy
- `expandedNodes`: Set of expanded department paths
- `searchQuery`: Current search term
- `selectedPerson`: Person selected for detail view
- `breadcrumbPath`: Current navigation path

### Data Flow

1. CSV file is loaded on mount
2. `parseCSV` converts flat CSV to nested tree
3. `filterTree` applies search query and returns filtered tree + auto-expand paths
4. `highlightMatch` adds HTML highlighting to search results
5. Components render recursively based on tree structure

## Key Features

### Search Functionality

- **Debounced input**: 300ms delay to reduce re-renders
- **Auto-expand**: Matching nodes and their ancestors automatically expand
- **Highlight**: Search terms highlighted in yellow
- **Multi-field**: Searches name, title, and email

### Depth-Based Coloring

Departments use progressively lighter colors as you go deeper:

- Depth 0: `bg-slate-700` (darkest)
- Depth 1: `bg-slate-600`
- Depth 2: `bg-slate-500`
- Depth 3: `bg-slate-400`
- Depth 4+: `bg-slate-300` (lightest)

Text color automatically switches between white and dark for contrast.

### Expand/Collapse

- **Individual**: Click department header to toggle
- **Expand All**: Shows entire tree
- **Collapse All**: Hides all departments
- **Auto-expand on search**: Reveals matching results

### Accessibility

- Semantic HTML with proper ARIA attributes
- Keyboard navigation support
- Focus visible states
- Screen reader announcements
- Role-based elements (tree, treeitem, button)

## Customization

### Changing Colors

Edit `src/utils/colors.js`:

```javascript
export function getDepthColors(depth) {
  const backgrounds = [
    'bg-blue-700', // Change to your preferred color
    'bg-blue-600',
    // ...
  ];
  // ...
}
```

### Adding New Data Fields

1. Add column to CSV file
2. Update `parseCSV.js` to include new field:

```javascript
if (node.type === 'person') {
  node.department = row.Department ? row.Department.trim() : '';
}
```

1. Display in `PersonCard.jsx` or `DetailPanel.jsx`

### Customizing Icons

Icons are from Lucide React. Change imports in component files:

```javascript
import { Building, Users, Mail } from 'lucide-react';
```

See [Lucide icons](https://lucide.dev) for available options.

## CSV Data Format

### Required Columns

- **Path**: Hierarchical path (e.g., `/Finance/Accounting`)
- **Type**: `department` or `person`
- **Name**: Display name

### Optional Columns (for people)

- **Title**: Job title
- **Email**: Email address
- **Phone**: Phone number

### Path Rules

1. Must start with `/`
2. Use `/` as separator
3. No trailing slash
4. URL-safe characters (lowercase, hyphens for spaces)
5. Parent must exist before children

### Example

```csv

Path,Type,Name,Title,Email,Phone
/Engineering,department,Engineering Department,,,,
/Engineering/Software,department,Software Development,,,,
/Engineering/Software/jane-doe,person,Jane Doe,Senior Engineer,jane@company.org,555-1234,Room 301

```

## Performance Considerations

### Tree Filtering

The `filterTree` function recursively walks the entire tree on each search query change. For very large organizations (1000+ people), consider:

1. **Memoization**: Already implemented via `useMemo`
2. **Virtual scrolling**: Use `react-window` for long lists
3. **Lazy loading**: Load departments on-demand
4. **Indexing**: Build search index on mount

### State Updates

- Debounced search prevents excessive re-renders
- Expand/collapse uses immutable Set for efficient updates
- Component keys use stable `path` values

## Testing Checklist

- [ ] Search filters correctly by name, title, email
- [ ] Search highlighting appears on matches
- [ ] Auto-expand reveals matching results
- [ ] Expand all/collapse all work correctly
- [ ] Person detail panel opens and closes
- [ ] Email/phone links work
- [ ] Keyboard navigation functions
- [ ] Mobile responsive layout
- [ ] Loading state displays during data fetch
- [ ] Error state shows on fetch failure

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

Requires ES6+ support (no IE11).

## Troubleshooting

### CSV Not Loading

Check browser console for fetch errors. In development, Vite serves files from the project root. The path `/src/data/sample-org.csv` should work.

For production, copy CSV to `public/` folder and update path to `/sample-org.csv`.

### Build Errors

Common issues:

1. **Missing dependencies**: Run `npm install`
2. **Node version**: Requires Node 16+
3. **Import paths**: Use relative imports (`./ or ../`)

### Styling Not Applied

1. Check Tailwind config includes your files
2. Ensure `index.css` imports Tailwind directives
3. Clear build cache: `rm -rf dist node_modules/.vite`

## Code Quality & Best Practices

### ESLint & TypeScript Patterns

#### Unused Catch Variables

When you don't need the error object in a catch block, use an empty catch instead of naming an unused parameter:

```typescript
// ❌ Bad - unused variable warning
try {
  await navigator.clipboard.writeText(text);
} catch (_err) {
  // Fallback
}

// ✅ Good - no parameter needed
try {
  await navigator.clipboard.writeText(text);
} catch {
  // Fallback
}
```

#### useEffect Dependencies

React's `exhaustive-deps` rule ensures effects re-run when their dependencies change. However, there are valid cases to disable it:

### Case 1: Functions defined in component scope

```typescript
const fetchData = async () => {
  /* ... */
};

useEffect(() => {
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Only run on mount - function changes every render
```

### Case 2: State being set within the effect

```typescript
useEffect(() => {
  const socket = io();
  setSocket(socket);

  return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated]); // Adding 'socket' would cause infinite loop
```

**Important**: When disabling the rule, always add a comment explaining WHY, not just suppressing the warning blindly.

### Running Quality Checks

**CRITICAL**: Always run lint and formatting checks before committing your changes. This ensures code consistency and prevents CI failures.

```bash

# Lint check
npm run lint              # Frontend
cd server && npm run lint # Backend

# Format check
npm run format:check      # Frontend
cd server && npm run format:check # Backend

# Fix formatting automatically
npm run format            # Frontend
cd server && npm run format # Backend

# Type check
npx tsc --noEmit          # TypeScript compilation

# Tests
npm test                  # Frontend
cd server && npm test     # Backend

```

Pre-commit hooks (via Husky) automatically run linting and formatting, but manual checks help catch issues earlier.

### Code Coverage & Ratcheting

We enforce strict code coverage thresholds for the backend (see [ADR 024](adr/024-coverage-maintenance-ratcheting.md)). Coverage must **never decrease**. We use a "ratcheting" system to ensure that as we add more tests, the required coverage percentage automatically goes up.

#### Updating Thresholds (Ratcheting)

If you have improved test coverage (e.g., by adding new tests), you should run the ratcheting script to "lock in" these gains:

```bash
npx tsx server/scripts/update-coverage-thresholds.ts
```

This script will:

1. Read the latest coverage report (`coverage/coverage-final.json`).
2. Compare it with current thresholds in `vitest.config.ts`.
3. Update `vitest.config.ts` if the new coverage is higher.

**Recommendation**: Run this script after adding significant tests to keep our quality bar rising.

## Future Enhancements

Potential features to add:

1. **Profile Photos**: Support for user profile pictures
2. **Teams/Groups**: Group people into project teams across departments
3. **Analytics Dashboard**: Department size visualizations and org metrics
4. **Social Authentication**: Sign in with Google/Apple OAuth
5. **LDAP/AD Integration**: Import from existing directory services
6. **SSO Support**: SAML integration for enterprise
7. **Webhook Support**: External system notifications
8. **List Virtualization**: `react-window` for ultra-large (>5000) lists
9. **API Rate Limiting Dashboard**: Visual usage metrics
10. **Offline Support**: Service workers for PWA capability

**Already Implemented:**

- ✅ CSV Import/Export (with ZIP bundling)
- ✅ PDF/PNG Export (via React Flow)
- ✅ Dark Mode (with system preference detection)
- ✅ Sorting and Filtering (in all list views)
- ✅ Org Chart View (React Flow visualization)
- ✅ Edit Mode (full CRUD operations)
- ✅ Custom Fields (organization-scoped)

## Contributing

When adding features:

1. Keep components small and focused
2. Use TypeScript for all new code (codebase is fully migrated)
3. Follow existing code style (enforced by ESLint/Prettier)
4. Add TypeScript interfaces for props and data types
5. Write tests for new functionality
6. Run linting before committing (`npm run lint:all`)
7. Update documentation as needed

## License

- **License**: GPL 3.0
