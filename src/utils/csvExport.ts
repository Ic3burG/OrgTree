import { Department, Person, CustomFieldDefinition } from '../types';

interface OrgData {
  departments: Department[];
}

/**
 * Generate CSV content from organization data
 */
export function generateCSV(org: OrgData, fieldDefinitions: CustomFieldDefinition[] = []): string {
  // Static headers
  const staticHeaders = ['Path', 'Type', 'Name', 'Title', 'Email', 'Phone', 'Description'];

  // All headers: static + sorted custom field keys
  // We use field_key for headers to ensure they can be re-imported reliably
  const headers = [...staticHeaders, ...fieldDefinitions.map(f => f.field_key)];

  const rows: string[][] = [headers];

  // Helper to build path and add rows
  const buildPath = (dept: Department, depts: Department[], path: string = ''): void => {
    const sanitize = (str: string): string => str.replace(/[/,]/g, '-');
    const currentPath = path ? `${path}/${sanitize(dept.name)}` : `/${sanitize(dept.name)}`;

    // Add department row
    const deptRow = [currentPath, 'department', dept.name, '', '', '', dept.description || ''];

    // Add custom field values for department
    fieldDefinitions.forEach(f => {
      if (f.entity_type === 'department') {
        deptRow.push(dept.custom_fields?.[f.field_key] || '');
      } else {
        deptRow.push(''); // Empty for person fields on a department row
      }
    });
    rows.push(deptRow);

    // Add people in this department
    (dept.people || []).forEach((person: Person) => {
      const personName = sanitize(person.name.toLowerCase().replace(/\s+/g, '-'));
      const personPath = `${currentPath}/${personName}`;

      const personRow = [
        personPath,
        'person',
        person.name,
        person.title || '',
        person.email || '',
        person.phone || '',
        '',
      ];

      // Add custom field values for person
      fieldDefinitions.forEach(f => {
        if (f.entity_type === 'person') {
          personRow.push(person.custom_fields?.[f.field_key] || '');
        } else {
          personRow.push(''); // Empty for department fields on a person row
        }
      });
      rows.push(personRow);
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
          const escaped = String(cell || '').replace(/"/g, '""');
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
