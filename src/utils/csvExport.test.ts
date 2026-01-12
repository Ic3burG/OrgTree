import { describe, it, expect, vi } from 'vitest';
import { generateCSV, downloadCSV } from './csvExport';
import { Department } from '../types';

describe('csvExport', () => {
  const mockData: { departments: Department[] } = {
    departments: [
      {
        id: '1',
        name: 'Engineering',
        description: 'Engineering Dept',
        sort_order: 1,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        organization_id: 'org1',
        parent_id: null,
        deleted_at: null,
        people: [
          {
            id: 'p1',
            name: 'John Doe',
            title: 'Engineer',
            email: 'john@example.com',
            phone: '123-456-7890',
            department_id: '1',
            sort_order: 1,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
            deleted_at: null,
          },
        ],
      },
      {
        id: '2',
        name: 'Frontend',
        description: 'Frontend Dept',
        sort_order: 2,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        organization_id: 'org1',
        parent_id: '1',
        deleted_at: null,
        people: [
          {
            id: 'p2',
            name: 'Jane Smith',
            title: 'Frontend Dev',
            email: 'jane@example.com',
            phone: '',
            department_id: '2',
            sort_order: 2,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
            deleted_at: null,
          },
        ],
      },
    ],
  };

  describe('generateCSV', () => {
    it('generates correct CSV structure', () => {
      const csv = generateCSV(mockData);
      const lines = csv.split('\n');

      // Header
      expect(lines[0]).toBe('Path,Type,Name,Title,Email,Phone,Description');

      // Engineering Dept
      expect(lines[1]).toContain('/Engineering,department,Engineering,,,,Engineering Dept');

      // John Doe
      expect(lines[2]).toContain(
        '/Engineering/john-doe,person,John Doe,Engineer,john@example.com,123-456-7890,'
      );

      // Frontend Dept (Nested)
      expect(lines[3]).toContain('/Engineering/Frontend,department,Frontend,,,,Frontend Dept');

      // Jane Smith
      expect(lines[4]).toContain(
        '/Engineering/Frontend/jane-smith,person,Jane Smith,Frontend Dev,jane@example.com,,'
      );
    });

    it('handles special characters by escaping', () => {
      const dataWithSpecialChars: { departments: Department[] } = {
        departments: [
          {
            id: '3',
            name: 'Sales, & Marketing',
            description: 'Description with "quotes"',
            organization_id: 'org1',
            sort_order: 1,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
            parent_id: null,
            deleted_at: null,
            people: [],
          },
        ],
      };

      const csv = generateCSV(dataWithSpecialChars);
      const lines = csv.split('\n');
      const row = lines[1];

      expect(row).toContain(
        '/Sales- & Marketing,department,"Sales, & Marketing",,,,"Description with ""quotes"""'
      );
    });

    it('handles empty data', () => {
      const csv = generateCSV({ departments: [] });
      expect(csv).toBe('Path,Type,Name,Title,Email,Phone,Description');
    });
  });

  describe('downloadCSV', () => {
    it('creates a blob and link to download', () => {
      const mockUrl = 'blob:http://localhost:3000/test-blob';
      global.URL.createObjectURL = vi.fn(() => mockUrl);
      global.URL.revokeObjectURL = vi.fn();

      const link = {
        click: vi.fn(),
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement;

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link);

      downloadCSV('test,content', 'test.csv');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(link.href).toBe(mockUrl);
      expect(link.download).toBe('test.csv');
      expect(link.click).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
  });
});
