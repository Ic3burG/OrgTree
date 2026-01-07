import { Department, Person } from '../types';

interface OrgData {
  departments: Department[];
}

/**
 * Generate CSV content from organization data
 */
export function generateCSV(org: OrgData): string {
  const rows: string[][] = [['Path', 'Type', 'Name', 'Title', 'Email', 'Phone', 'Description']];

  // Helper to build path and add rows
  const buildPath = (dept: Department, depts: Department[], path: string = ''): void => {
    const sanitize = (str: string): string => str.replace(/[/,]/g, '-');
    const currentPath = path ? `${path}/${sanitize(dept.name)}` : `/${sanitize(dept.name)}`;

    // Add department row
    rows.push([currentPath, 'department', dept.name, '', '', '', dept.description || '']);

    // Add people in this department
    (dept.people || []).forEach((person: Person) => {
      const personName = sanitize(person.name.toLowerCase().replace(/\s+/g, '-'));
      const personPath = `${currentPath}/${personName}`;
      rows.push([
        personPath,
        'person',
        person.name,
        person.title || '',
        person.email || '',
        person.phone || '',
        '',
      ]);
    });

    // Process children
    const children = depts.filter(d => d.parent_id === dept.id);
    children.forEach(child => buildPath(child, depts, currentPath));
  };

  // Start with top-level departments
  const topLevel = (org.departments || []).filter(d => !d.parent_id);
  topLevel.forEach(dept => buildPath(dept, org.departments));

  // Convert to CSV string
  const csvContent = rows
    .map(row =>
      row
        .map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped;
        })
        .join(',')
    )
    .join('\n');

  return csvContent;
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
