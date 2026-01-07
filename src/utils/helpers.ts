/**
 * Helper utility functions
 */

/**
 * Get initials from a person's name
 * @param name - Full name
 * @returns Initials (up to 2 characters)
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0]?.substring(0, 2).toUpperCase() || '?';
  }

  const firstInitial = parts[0]?.[0] || '';
  const lastInitial = parts[parts.length - 1]?.[0] || '';
  return (firstInitial + lastInitial).toUpperCase() || '?';
}
