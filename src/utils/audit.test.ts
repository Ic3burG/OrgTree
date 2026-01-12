import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatActionType,
  formatEntityType,
  getActionColor,
  formatEntityDetails,
  formatDate,
} from './audit';

describe('formatActionType', () => {
  it('should format action type with entity type', () => {
    expect(formatActionType('created', 'person')).toBe('Created Person');
    expect(formatActionType('updated', 'department')).toBe('Updated Department');
    expect(formatActionType('deleted', 'member')).toBe('Deleted Member');
  });

  it('should capitalize first letter of action', () => {
    expect(formatActionType('added', 'org')).toBe('Added Organization');
  });

  it('should handle unknown entity types', () => {
    expect(formatActionType('created', 'unknown')).toBe('Created unknown');
  });
});

describe('formatEntityType', () => {
  it('should format known entity types', () => {
    expect(formatEntityType('person')).toBe('Person');
    expect(formatEntityType('department')).toBe('Department');
    expect(formatEntityType('member')).toBe('Member');
    expect(formatEntityType('org')).toBe('Organization');
    expect(formatEntityType('data_import')).toBe('Data Import');
  });

  it('should return original type for unknown entities', () => {
    expect(formatEntityType('custom')).toBe('custom');
    expect(formatEntityType('foobar')).toBe('foobar');
  });
});

describe('getActionColor', () => {
  it('should return correct colors for known actions', () => {
    expect(getActionColor('created')).toBe(
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    );
    expect(getActionColor('updated')).toBe(
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    );
    expect(getActionColor('deleted')).toBe(
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    );
    expect(getActionColor('added')).toBe(
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    );
    expect(getActionColor('removed')).toBe(
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    );
    expect(getActionColor('settings')).toBe(
      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    );
    expect(getActionColor('import')).toBe(
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    );
  });

  it('should return default color for unknown actions', () => {
    expect(getActionColor('unknown')).toBe(
      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    );
    expect(getActionColor('custom')).toBe(
      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    );
  });
});

describe('formatEntityDetails', () => {
  it('should return N/A for null data', () => {
    expect(formatEntityDetails('person', null)).toBe('N/A');
    expect(formatEntityDetails('department', null)).toBe('N/A');
  });

  it('should format person details', () => {
    expect(formatEntityDetails('person', { name: 'John Doe' })).toBe('John Doe');
    expect(formatEntityDetails('person', { id: '123' })).toBe('Unknown');
    expect(formatEntityDetails('person', {})).toBe('Unknown');
  });

  it('should format department details', () => {
    expect(formatEntityDetails('department', { name: 'Engineering' })).toBe('Engineering');
    expect(formatEntityDetails('department', {})).toBe('Unknown');
  });

  it('should format member details with full info', () => {
    expect(formatEntityDetails('member', { userName: 'John', role: 'admin' })).toBe('John (admin)');
    expect(formatEntityDetails('member', { userName: 'Jane', role: 'editor' })).toBe(
      'Jane (editor)'
    );
  });

  it('should format member details with partial info', () => {
    expect(formatEntityDetails('member', { email: 'john@example.com' })).toBe('john@example.com');
    expect(formatEntityDetails('member', { userName: 'John' })).toBe('John');
    expect(formatEntityDetails('member', {})).toBe('Unknown');
  });

  it('should format organization details', () => {
    expect(formatEntityDetails('org', { name: 'Acme Corp' })).toBe('Acme Corp');
    expect(formatEntityDetails('org', {})).toBe('Organization');
  });

  it('should format data import details with all statistics', () => {
    expect(
      formatEntityDetails('data_import', {
        departmentsCreated: 5,
        departmentsReused: 2,
        peopleCreated: 10,
        peopleSkipped: 3,
      })
    ).toBe('7 depts (5 created, 2 reused), 13 people (10 added, 3 skipped)');
  });

  it('should format data import details with only departments', () => {
    expect(
      formatEntityDetails('data_import', {
        departmentsCreated: 3,
        departmentsReused: 0,
        peopleCreated: 0,
        peopleSkipped: 0,
      })
    ).toBe('3 depts (3 created)');
  });

  it('should format data import details with only people', () => {
    expect(
      formatEntityDetails('data_import', {
        departmentsCreated: 0,
        departmentsReused: 0,
        peopleCreated: 8,
        peopleSkipped: 1,
      })
    ).toBe('9 people (8 added, 1 skipped)');
  });

  it('should format data import details with singular values', () => {
    expect(
      formatEntityDetails('data_import', {
        departmentsCreated: 1,
        departmentsReused: 0,
        peopleCreated: 1,
        peopleSkipped: 0,
      })
    ).toBe('1 dept (1 created), 1 person (1 added)');
  });

  it('should handle empty data import', () => {
    expect(
      formatEntityDetails('data_import', {
        departmentsCreated: 0,
        departmentsReused: 0,
        peopleCreated: 0,
        peopleSkipped: 0,
      })
    ).toBe('No items imported');
  });

  it('should handle unknown entity types with fallback logic', () => {
    expect(formatEntityDetails('custom', { name: 'Test' })).toBe('Test');
    expect(formatEntityDetails('custom', { id: '123' })).toBe('123');
    expect(formatEntityDetails('custom', {})).toBe('N/A');
  });
});

describe('formatDate', () => {
  beforeEach(() => {
    // Mock Date.now to a fixed point in time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Just now" for very recent dates', () => {
    const now = new Date('2024-01-15T12:00:00Z').toISOString();
    expect(formatDate(now)).toBe('Just now');

    const thirtySecondsAgo = new Date('2024-01-15T11:59:30Z').toISOString();
    expect(formatDate(thirtySecondsAgo)).toBe('Just now');
  });

  it('should return minutes ago for recent dates', () => {
    const oneMinuteAgo = new Date('2024-01-15T11:59:00Z').toISOString();
    expect(formatDate(oneMinuteAgo)).toBe('1 minute ago');

    const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z').toISOString();
    expect(formatDate(fiveMinutesAgo)).toBe('5 minutes ago');

    const thirtyMinutesAgo = new Date('2024-01-15T11:30:00Z').toISOString();
    expect(formatDate(thirtyMinutesAgo)).toBe('30 minutes ago');
  });

  it('should return hours ago for dates within 24 hours', () => {
    const oneHourAgo = new Date('2024-01-15T11:00:00Z').toISOString();
    expect(formatDate(oneHourAgo)).toBe('1 hour ago');

    const fiveHoursAgo = new Date('2024-01-15T07:00:00Z').toISOString();
    expect(formatDate(fiveHoursAgo)).toBe('5 hours ago');

    const twentyHoursAgo = new Date('2024-01-14T16:00:00Z').toISOString();
    expect(formatDate(twentyHoursAgo)).toBe('20 hours ago');
  });

  it('should return days ago for dates within 7 days', () => {
    const oneDayAgo = new Date('2024-01-14T12:00:00Z').toISOString();
    expect(formatDate(oneDayAgo)).toBe('1 day ago');

    const threeDaysAgo = new Date('2024-01-12T12:00:00Z').toISOString();
    expect(formatDate(threeDaysAgo)).toBe('3 days ago');

    const sixDaysAgo = new Date('2024-01-09T12:00:00Z').toISOString();
    expect(formatDate(sixDaysAgo)).toBe('6 days ago');
  });

  it('should return formatted date for dates older than 7 days', () => {
    const eightDaysAgo = new Date('2024-01-07T12:00:00Z').toISOString();
    const formatted = formatDate(eightDaysAgo);
    // Should contain month and day, but exact format depends on locale
    expect(formatted).toMatch(/Jan.*7/);
  });

  it('should include year for dates from previous years', () => {
    const lastYear = new Date('2023-12-01T12:00:00Z').toISOString();
    const formatted = formatDate(lastYear);
    expect(formatted).toContain('2023');
  });
});
