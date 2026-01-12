/**
 * Format action type for display
 * @param actionType - Action type (created, updated, deleted, etc.)
 * @param entityType - Entity type (department, person, member, org)
 * @returns Formatted action string
 */
export function formatActionType(actionType: string, entityType: string): string {
  const action = actionType.charAt(0).toUpperCase() + actionType.slice(1);
  const entity = formatEntityType(entityType);
  return `${action} ${entity}`;
}

/**
 * Format entity type for display
 * @param entityType - Entity type (person, department, member, org)
 * @returns Formatted entity type
 */
export function formatEntityType(entityType: string): string {
  const typeMap: Record<string, string> = {
    person: 'Person',
    department: 'Department',
    member: 'Member',
    org: 'Organization',
    data_import: 'Data Import',
  };
  return typeMap[entityType] || entityType;
}

/**
 * Get badge color for action type
 * @param actionType - Action type
 * @returns Tailwind color class
 */
export function getActionColor(actionType: string): string {
  const colorMap: Record<string, string> = {
    created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    added: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    removed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    settings: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    import: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  };
  return colorMap[actionType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
}

interface EntityData {
  name?: string;
  id?: string;
  userName?: string;
  role?: string;
  email?: string;
  departmentsCreated?: number;
  departmentsReused?: number;
  peopleCreated?: number;
  peopleSkipped?: number;
  [key: string]: unknown;
}

/**
 * Format entity details from entity data for display
 * @param entityType - Entity type
 * @param entityData - Entity data JSON
 * @returns Formatted details string
 */
export function formatEntityDetails(entityType: string, entityData: EntityData | null): string {
  if (!entityData) return 'N/A';

  switch (entityType) {
    case 'person':
      return entityData.name || 'Unknown';

    case 'department':
      return entityData.name || 'Unknown';

    case 'member':
      if (entityData.userName && entityData.role) {
        return `${entityData.userName} (${entityData.role})`;
      }
      return entityData.email || entityData.userName || 'Unknown';

    case 'org':
      return entityData.name || 'Organization';

    case 'data_import': {
      const parts: string[] = [];

      // Departments
      const deptCreated = entityData.departmentsCreated || 0;
      const deptReused = entityData.departmentsReused || 0;
      const deptTotal = deptCreated + deptReused;

      if (deptTotal > 0) {
        const deptDetails: string[] = [];
        if (deptCreated > 0) deptDetails.push(`${deptCreated} created`);
        if (deptReused > 0) deptDetails.push(`${deptReused} reused`);
        parts.push(`${deptTotal} dept${deptTotal !== 1 ? 's' : ''} (${deptDetails.join(', ')})`);
      }

      // People
      const peopleCreated = entityData.peopleCreated || 0;
      const peopleSkipped = entityData.peopleSkipped || 0;
      const peopleTotal = peopleCreated + peopleSkipped;

      if (peopleTotal > 0) {
        const peopleDetails: string[] = [];
        if (peopleCreated > 0) peopleDetails.push(`${peopleCreated} added`);
        if (peopleSkipped > 0) peopleDetails.push(`${peopleSkipped} skipped`);
        parts.push(
          `${peopleTotal} ${peopleTotal !== 1 ? 'people' : 'person'} (${peopleDetails.join(', ')})`
        );
      }

      return parts.length > 0 ? parts.join(', ') : 'No items imported';
    }

    default:
      return entityData.name || entityData.id || 'N/A';
  }
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute
  if (diffMins < 1) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than 7 days
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  // Format as date and time
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
