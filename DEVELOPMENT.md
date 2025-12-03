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

```
Directory (main container)
├── SearchBar
├── Breadcrumbs
├── DepartmentCard (recursive)
│   ├── DepartmentCard (nested departments)
│   └── PersonCard
│       └── ContactIcons
└── DetailPanel
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
    'bg-blue-700',  // Change to your preferred color
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

3. Display in `PersonCard.jsx` or `DetailPanel.jsx`

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

## Future Enhancements

Potential features to add:

1. **CSV Upload**: Allow users to upload their own files
2. **Export**: Generate PDF or print-friendly view
3. **Dark Mode**: Toggle between light/dark themes
4. **Sorting**: Sort people by name, title, etc.
5. **Filtering**: Filter by department, title, etc.
6. **Org Chart View**: Visual tree diagram
7. **Edit Mode**: Add/edit/delete entries
8. **Photos**: Support for profile pictures
9. **Teams**: Group people into project teams
10. **Analytics**: Department size visualizations

## Contributing

When adding features:

1. Keep components small and focused
2. Use TypeScript for type safety (optional migration)
3. Follow existing code style
4. Add PropTypes or TypeScript interfaces
5. Update this documentation

## License

MIT
