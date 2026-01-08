import { describe, it, expect } from 'vitest';
import { getInitials } from './helpers';

describe('getInitials', () => {
  it('should return initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane Smith')).toBe('JS');
  });

  it('should return first two letters for single-word name', () => {
    expect(getInitials('Alice')).toBe('AL');
    expect(getInitials('Bob')).toBe('BO');
    expect(getInitials('X')).toBe('X');
  });

  it('should handle multi-word names (first and last initial)', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
    expect(getInitials('Mary Jane Watson Parker')).toBe('MP');
  });

  it('should handle null, undefined, and empty strings', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });

  it('should handle names with extra whitespace', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
    expect(getInitials('Jane\t\nSmith')).toBe('JS');
  });

  it('should uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD');
    expect(getInitials('alice')).toBe('AL');
  });

  it('should handle special characters in names', () => {
    expect(getInitials("O'Brien")).toBe('OB');
    expect(getInitials('Mary-Jane')).toBe('MJ');
  });
});
