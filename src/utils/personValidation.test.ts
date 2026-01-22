import { validatePerson } from './personValidation';
import { describe, it, expect } from 'vitest';

describe('personValidation', () => {
  it('should return empty errors for valid data', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      title: 'Developer',
    };
    const errors = validatePerson(data);
    expect(errors).toEqual({});
  });

  it('should require name', () => {
    const data = {
      name: '',
      email: 'john@example.com',
    };
    const errors = validatePerson(data);
    expect(errors.name).toBe('Name is required');
  });

  it('should validate email format', () => {
    const data = {
      name: 'John Doe',
      email: 'invalid-email',
    };
    const errors = validatePerson(data);
    expect(errors.email).toBe('Invalid email format');
  });

  it('should allow empty optional fields', () => {
    const data = {
      name: 'John Doe',
      email: '',
      phone: '',
    };
    const errors = validatePerson(data);
    expect(errors).toEqual({});
  });
});
