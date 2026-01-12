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
                manager_id: 'p1',
                type: 'department',
                parent_id: null,
                people: [
                    {
                        id: 'p1',
                        name: 'John Doe',
                        title: 'Engineer',
                        email: 'john@example.com',
                        phone: '123-456-7890',
                        department_id: '1',
                        picture: '',
                        bio: '',
                        start_date: '',
                        location: '',
                        skills: [],
                        social_links: {}
                    }
                ]
            },
            {
                id: '2',
                name: 'Frontend',
                description: 'Frontend Dept',
                manager_id: null,
                type: 'department',
                parent_id: '1',
                people: [
                    {
                        id: 'p2',
                        name: 'Jane Smith',
                        title: 'Frontend Dev',
                        email: 'jane@example.com',
                        phone: '',
                        department_id: '2',
                         picture: '',
                        bio: '',
                        start_date: '',
                        location: '',
                        skills: [],
                        social_links: {}
                    }
                ]
            }
        ]
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
            expect(lines[2]).toContain('/Engineering/john-doe,person,John Doe,Engineer,john@example.com,123-456-7890,');

            // Frontend Dept (Nested)
            expect(lines[3]).toContain('/Engineering/Frontend,department,Frontend,,,,Frontend Dept');
            
            // Jane Smith
            expect(lines[4]).toContain('/Engineering/Frontend/jane-smith,person,Jane Smith,Frontend Dev,jane@example.com,,');
        });

        it('handles special characters by escaping', () => {
            const dataWithSpecialChars: { departments: Department[] } = {
                departments: [{
                    id: '3',
                    name: 'Sales, & Marketing',
                    description: 'Description with "quotes"',
                    manager_id: null,
                    type: 'department',
                    parent_id: null,
                    people: []
                }]
            };

            const csv = generateCSV(dataWithSpecialChars);
            const lines = csv.split('\n');
            const row = lines[1];

            // Should escape path slash replacement: Sales- & Marketing
            // Should quote the name because of comma handling in raw, checking implementation:
            // The implementation replaces / and , in PATH generation with -.
            // In the Name column, it should wrap in quotes if it has comma.
            
            // Checking path generation in csvExport.ts: 
            // const sanitize = (str: string): string => str.replace(/[/,]/g, '-');
            // So path will be /Sales--&-Marketing.
            
            // Name 'Sales, & Marketing' contains comma, so it should be quoted: "Sales, & Marketing"
            // Description 'Description with "quotes"' contains quotes, so they should be escaped: "Description with ""quotes"""

            expect(row).toContain('/Sales- & Marketing,department,"Sales, & Marketing",,,,"Description with ""quotes"""');
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
                download: ''
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
