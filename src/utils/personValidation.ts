interface PersonFormData {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
}

/**
 * Validates person data for editing
 * Shared between inline editing and full edit modal to ensure consistency
 */
export function validatePerson(data: PersonFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Optional: Add phone validation if needed
  // if (data.phone && !/^\+?[\d\s-()]+$/.test(data.phone)) {
  //   errors.phone = 'Invalid phone number';
  // }

  return errors;
}
