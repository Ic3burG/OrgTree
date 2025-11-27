# Organization Map

An interactive, visual organization map built with React and React Flow. Displays your organization structure as a pannable, zoomable flowchart with expandable department nodes and detailed contact information.

## Features

- **Interactive Canvas**: Pan, zoom, and navigate through your organization visually
- **Hierarchical Layout**: Automatically arranged tree structure with parent-child relationships
- **Expandable Nodes**: Click departments to show/hide team members
- **Search & Navigate**: Real-time search with auto-zoom to results
- **Detail Panels**: Click any person to view full contact information
- **Flexible Layouts**: Toggle between vertical (top-to-bottom) and horizontal (left-to-right) views
- **Depth-Based Coloring**: Visual hierarchy with darker colors for top-level departments
- **Mini-Map**: Bird's-eye view for easy navigation of large organizations
- **Responsive Controls**: Zoom, fit-to-view, expand/collapse all

## Tech Stack

- **React 18** (with hooks)
- **React Flow** for interactive canvas and node visualization
- **Dagre** for automatic hierarchical layout calculations
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Papa Parse** for CSV parsing
- **Vite** for build tooling

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Visit `http://localhost:3000` to view the application.

## Build

```bash
npm run build
```

## Data Format

The application uses CSV files with the following structure:

```csv
Path,Type,Name,Title,Email,Phone,Office
/Executive,department,Executive Office,,,,
/Executive/john-smith,person,John Smith,CEO,john@company.org,555-1001,Room 100
/Finance,department,Finance Department,,,,
/Finance/susan-lee,person,Susan Lee,CFO,susan@company.org,555-2001,Room 200
/Finance/Accounting,department,Accounting,,,,
/Finance/Accounting/bob-chen,person,Bob Chen,Senior Accountant,bob@company.org,555-2010,Room 205
```

### Column Descriptions

- **Path**: Hierarchical path using `/` separator (e.g., `/Finance/Accounting`)
- **Type**: Either `department` or `person`
- **Name**: Display name for the department or person
- **Title**: Job title (for people only)
- **Email**: Email address (for people only)
- **Phone**: Phone number (for people only)
- **Office**: Office location (for people only)

### Path Rules

1. Must start with `/`
2. Use `/` as separator between levels
3. No trailing slash
4. Parent departments must be defined before children
5. URL-safe characters recommended (lowercase, hyphens for spaces)

## Project Structure

```
/src
  /components
    OrgMap.jsx              # Main canvas container with React Flow
    DepartmentNode.jsx      # Custom node component for departments
    PersonRowCard.jsx       # Person card inside expanded departments
    DetailPanel.jsx         # Slide-in panel with full contact info
    SearchOverlay.jsx       # Floating search with results dropdown
    Toolbar.jsx             # Zoom and layout controls
  /utils
    parseCSVToFlow.js       # CSV parser for React Flow format
    layoutEngine.js         # Dagre layout calculations
    colors.js               # Depth-based color system
    helpers.js              # Shared utility functions
  /data
    sample-org.csv          # Sample organization data (33 people)
  App.jsx                   # Root component with ReactFlowProvider
  main.jsx                  # Entry point
  index.css                 # Global styles + React Flow overrides
```

## Key Interactions

### Pan & Zoom
- **Pan**: Click and drag the background
- **Zoom**: Scroll wheel or use toolbar buttons
- **Fit View**: Click the maximize icon to fit entire org chart in view

### Expand/Collapse Departments
- **Single**: Click any department header to toggle
- **All**: Use toolbar buttons to expand/collapse all at once

### View Person Details
- **Expand Department**: Click department to show team members
- **Click Person**: Click any person row to open detail panel
- **Contact Links**: Email and phone are clickable in detail panel

### Search
- **Type to Search**: Real-time filtering of departments and people
- **Select Result**: Click a search result to:
  - Zoom and center the node on canvas
  - Expand department (if result is a person)
  - Highlight with pulsing animation
  - Open detail panel (for people)

### Layout Toggle
- **Vertical (TB)**: Top-to-bottom hierarchy (default)
- **Horizontal (LR)**: Left-to-right hierarchy
- **Click Arrow Icon**: Toggle between layouts
- **Auto-Reflow**: Positions recalculate automatically

## Depth-Based Colors

Departments use progressively lighter colors as you go deeper in the hierarchy:

- **Level 0** (Top): `#334155` (slate-700) - Darkest
- **Level 1**: `#475569` (slate-600)
- **Level 2**: `#64748b` (slate-500)
- **Level 3**: `#94a3b8` (slate-400)
- **Level 4+**: `#cbd5e1` (slate-300) - Lightest

Text automatically switches between white and dark for optimal contrast.

## Sample Data

The included `sample-org.csv` contains:
- 5 top-level departments (Executive, Finance, Operations, Marketing, HR)
- 33 total people across the organization
- Up to 4 levels of hierarchy
- Realistic job titles and contact information

## Customization

### Changing Colors

Edit `src/utils/colors.js`:

```javascript
export function getDepthColors(depth) {
  const colors = [
    { bg: 'bg-blue-700', hex: '#1d4ed8', text: 'text-white', hover: 'hover:bg-blue-600' },
    // ...add your colors
  ];
}
```

### Adjusting Layout

Modify spacing in `src/utils/layoutEngine.js`:

```javascript
g.setGraph({
  rankdir: direction,
  nodesep: 80,    // horizontal spacing
  ranksep: 120,   // vertical spacing
  // ...
});
```

### Adding Custom Data Fields

1. Add column to CSV
2. Update parser in `src/utils/parseCSVToFlow.js`
3. Display in `PersonRowCard.jsx` or `DetailPanel.jsx`

## Performance

The application efficiently handles organizations with:
- **Nodes**: 100+ departments
- **People**: 500+ employees
- **Hierarchy Depth**: 6+ levels

React Flow's built-in virtualization ensures smooth performance even with large datasets.

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

Requires ES6+ support (no IE11).

## Accessibility

- Keyboard navigation supported
- ARIA labels on interactive elements
- Focus visible states
- Screen reader friendly
- Semantic HTML structure

## License

MIT
