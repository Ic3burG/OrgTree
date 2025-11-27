# Organization Directory Tree

An interactive, tree-style organization directory built with React. Departments and sub-departments appear as expandable card boxes with depth-based color shading. People appear as contact cards nested within their departments.

## Features

- **Hierarchical Tree View**: Expandable/collapsible department cards with visual depth indicators
- **Search Functionality**: Real-time search with auto-expand and highlighting
- **Contact Cards**: Interactive person cards with email, phone, and location info
- **Detail Panel**: Slide-in panel with full contact information
- **Breadcrumb Navigation**: Easy navigation through department hierarchy
- **Expand/Collapse All**: Quick controls to expand or collapse entire tree
- **Responsive Design**: Works on desktop and mobile devices
- **CSV Data Import**: Load organization data from CSV files

## Tech Stack

- React 18 (with hooks)
- Tailwind CSS for styling
- Lucide React for icons
- Papa Parse for CSV parsing
- Vite for build tooling

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
```

- **Path**: Hierarchical path (e.g., `/Finance/Accounting`)
- **Type**: Either `department` or `person`
- **Name**: Display name
- **Title**: Job title (for people only)
- **Email**: Email address (for people only)
- **Phone**: Phone number (for people only)
- **Office**: Office location (for people only)

## Project Structure

```
/src
  /components
    Directory.jsx         # Main container component
    DepartmentCard.jsx    # Expandable department box
    PersonCard.jsx        # Contact card for individuals
    SearchBar.jsx         # Search input with filtering
    Breadcrumbs.jsx       # Navigation breadcrumb trail
    ContactIcons.jsx      # Email/phone/location icons
    DetailPanel.jsx       # Expanded person view
  /utils
    parseCSV.js           # CSV to nested tree converter
    filterTree.js         # Search filtering logic
    colors.js             # Depth-based color system
  /data
    sample-org.csv        # Sample organization data
  App.jsx                 # Root component
  main.jsx                # Entry point
  index.css               # Global styles
```

## License

MIT
