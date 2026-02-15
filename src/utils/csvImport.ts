/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

export interface CSVRow {
  [key: string]: string;
}

export interface CSVImportResult {
  departmentsCreated: number;
  departmentsReused?: number;
  peopleCreated: number;
  peopleSkipped: number;
  errors: string[];
}

/**
 * Parse CSV text into array of objects
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0] as string).map(h => h.toLowerCase().trim());

  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: CSVRow = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() || '';
    });
    return row;
  });

  return rows;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i] as string;

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Validate CSV data format
 */
export function validateCSVData(rows: CSVRow[]): string[] {
  const errors: string[] = [];

  if (rows.length === 0) {
    errors.push('CSV file is empty');
    return errors;
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because we skip header and use 1-based indexing

    if (!row['path']) {
      errors.push(`Row ${rowNum}: Missing path`);
    }
    if (!row['type'] || !['department', 'person'].includes(row['type'].toLowerCase())) {
      errors.push(`Row ${rowNum}: Invalid type (must be 'department' or 'person')`);
    }
    if (!row['name'] || !row['name'].trim()) {
      errors.push(`Row ${rowNum}: Missing name`);
    }
  });

  return errors;
}
