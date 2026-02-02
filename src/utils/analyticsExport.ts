/**
 * Convert an array of objects to CSV string
 */
export function convertToCSV(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  columns?: string[]
): string {
  if (!data || data.length === 0) {
    return '';
  }

  // If columns not provided, use keys from first object
  const headers = columns || Object.keys(data[0]);

  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers
        .map(header => {
          const val = row[header];
          // Handle null/undefined
          if (val === null || val === undefined) return '';
          // Escape quotes and wrap in quotes if contains comma or newline
          const str = String(val);
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');
    }),
  ];

  return csvRows.join('\n');
}

/**
 * Trigger download of a CSV file
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
