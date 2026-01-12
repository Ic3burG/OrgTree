import { describe, it, expect } from 'vitest';
import { parseCSV, validateCSVData } from './csvImport';

describe('csvImport', () => {
  describe('parseCSV', () => {
    it('parses simple CSV correctly', () => {
      const csv = 'Name,Type\nJohn,person\nEng,department';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', type: 'person' });
      expect(result[1]).toEqual({ name: 'Eng', type: 'department' });
    });

    it('parses CSV with quoted values correctly', () => {
      const csv = 'Name,Description\n"Doe, John","Has quotes"';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'Doe, John', description: 'Has quotes' });
    });

    it('handles escaped quotes', () => {
      const csv = 'Name,Description\nTest,"Say ""Hello"""';
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'Test', description: 'Say "Hello"' });
    });

    it('returns empty array for empty input', () => {
      const result = parseCSV('');
      expect(result).toEqual([]);
    });

    it('handles whitespace in headers and values', () => {
      const csv = ' Name , Type \n  John  ,  person  ';
      const result = parseCSV(csv);
      expect(result[0]).toEqual({ name: 'John', type: 'person' });
    });
  });

  describe('validateCSVData', () => {
    it('validates correct data', () => {
      const data = [
        { path: '/eng', type: 'department', name: 'Engineering' },
        { path: '/eng/john', type: 'person', name: 'John' },
      ];
      const errors = validateCSVData(data);
      expect(errors).toHaveLength(0);
    });

    it('detects missing path', () => {
      const data = [{ type: 'department', name: 'Eng' }];
      const errors = validateCSVData(data);
      expect(errors).toContain('Row 2: Missing path');
    });

    it('detects invalid type', () => {
      const data = [
        { path: '/test', type: 'invalid', name: 'Test' },
        { path: '/test2', type: '', name: 'Test2' },
      ];
      const errors = validateCSVData(data);
      expect(errors).toContain("Row 2: Invalid type (must be 'department' or 'person')");
      expect(errors).toContain("Row 3: Invalid type (must be 'department' or 'person')");
    });

    it('detects missing name', () => {
      const data = [{ path: '/eng', type: 'department', name: '' }];
      const errors = validateCSVData(data);
      expect(errors).toContain('Row 2: Missing name');
    });

    it('detects empty file', () => {
      const errors = validateCSVData([]);
      expect(errors).toContain('CSV file is empty');
    });
  });
});
