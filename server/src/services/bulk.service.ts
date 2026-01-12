import db from '../db.js';
import { requireOrgPermission } from './member.service.js';
import {
  emitPersonDeleted,
  emitPersonUpdated,
  emitDepartmentDeleted,
  emitDepartmentUpdated,
} from './socket-events.service.js';
import type { AppError } from '../types/index.js';

interface Actor {
  id: string;
  name: string;
}

interface FailedItem {
  id: string;
  error: string;
}

interface DeletedPerson {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  departmentId: string;
  organization_id: string;
  departmentName: string;
}

interface DeletedDepartment {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  organization_id: string;
}

interface BulkDeleteResult {
  success: boolean;
  deleted: DeletedPerson[];
  failed: FailedItem[];
  deletedCount: number;
  failedCount: number;
}

interface MovedPerson {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  departmentId: string;
  organization_id: string;
  departmentName: string;
}

interface BulkMoveResult {
  success: boolean;
  moved: MovedPerson[];
  failed: FailedItem[];
  movedCount: number;
  failedCount: number;
}

interface UpdatedPerson {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  departmentId: string;
  organization_id: string;
  departmentName: string;
}

interface UpdatedDepartment {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  organization_id: string;
}

interface BulkEditResult {
  success: boolean;
  updated: (UpdatedPerson | UpdatedDepartment)[];
  failed: FailedItem[];
  updatedCount: number;
  failedCount: number;
}

interface BulkDeleteDepartmentsResult {
  success: boolean;
  deleted: DeletedDepartment[];
  failed: FailedItem[];
  warnings: string[];
  deletedCount: number;
  failedCount: number;
}

interface PersonUpdates {
  title?: string;
  departmentId?: string;
}

interface DepartmentUpdates {
  parentId?: string | null;
}

interface CountResult {
  count: number;
}

/**
 * Bulk delete people with individual audit logs for each
 */
export function bulkDeletePeople(
  orgId: string,
  personIds: string[],
  actor: Actor
): BulkDeleteResult {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(personIds) || personIds.length === 0) {
    const error = new Error('personIds must be a non-empty array') as AppError;
    error.status = 400;
    throw error;
  }

  if (personIds.length > 100) {
    const error = new Error('Cannot delete more than 100 items at once') as AppError;
    error.status = 400;
    throw error;
  }

  const deleted: DeletedPerson[] = [];
  const failed: FailedItem[] = [];

  // Use transaction for atomicity
  const deleteTransaction = db.transaction(() => {
    for (const personId of personIds) {
      try {
        // Get full person data before delete (for audit trail)
        const person = db
          .prepare(
            `
          SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId,
                 d.organization_id, d.name as departmentName
          FROM people p
          JOIN departments d ON p.department_id = d.id
          WHERE p.id = ? AND d.organization_id = ? AND p.deleted_at IS NULL AND d.deleted_at IS NULL
        `
          )
          .get(personId, orgId) as DeletedPerson | undefined;

        if (!person) {
          failed.push({ id: personId, error: 'Person not found in this organization' });
          continue;
        }

        // Soft delete the person
        const now = new Date().toISOString();
        const result = db
          .prepare('UPDATE people SET deleted_at = ?, updated_at = ? WHERE id = ?')
          .run(now, now, personId);

        if (result.changes > 0) {
          deleted.push(person);
          // Emit event (also creates audit log)
          emitPersonDeleted(orgId, person as unknown as Record<string, unknown>, actor);
        } else {
          failed.push({ id: personId, error: 'Failed to delete' });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ id: personId, error: errorMessage });
      }
    }
  });

  deleteTransaction();

  return {
    success: deleted.length > 0,
    deleted,
    failed,
    deletedCount: deleted.length,
    failedCount: failed.length,
  };
}

/**
 * Bulk move people to a different department
 */
export function bulkMovePeople(
  orgId: string,
  personIds: string[],
  targetDepartmentId: string,
  actor: Actor
): BulkMoveResult {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(personIds) || personIds.length === 0) {
    const error = new Error('personIds must be a non-empty array') as AppError;
    error.status = 400;
    throw error;
  }

  if (!targetDepartmentId) {
    const error = new Error('targetDepartmentId is required') as AppError;
    error.status = 400;
    throw error;
  }

  if (personIds.length > 100) {
    const error = new Error('Cannot move more than 100 items at once') as AppError;
    error.status = 400;
    throw error;
  }

  // Verify target department exists and belongs to this org
  const targetDept = db
    .prepare(
      `
    SELECT id, name FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
  `
    )
    .get(targetDepartmentId, orgId) as { id: string; name: string } | undefined;

  if (!targetDept) {
    const error = new Error('Target department not found in this organization') as AppError;
    error.status = 404;
    throw error;
  }

  const moved: MovedPerson[] = [];
  const failed: FailedItem[] = [];
  const now = new Date().toISOString();

  const moveTransaction = db.transaction(() => {
    for (const personId of personIds) {
      try {
        // Verify person exists and belongs to this org
        const person = db
          .prepare(
            `
          SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId,
                 d.organization_id, d.name as departmentName
          FROM people p
          JOIN departments d ON p.department_id = d.id
          WHERE p.id = ? AND d.organization_id = ? AND p.deleted_at IS NULL AND d.deleted_at IS NULL
        `
          )
          .get(personId, orgId) as MovedPerson | undefined;

        if (!person) {
          failed.push({ id: personId, error: 'Person not found in this organization' });
          continue;
        }

        // Skip if already in target department
        if (person.departmentId === targetDepartmentId) {
          failed.push({ id: personId, error: 'Already in target department' });
          continue;
        }

        // Move the person
        const result = db
          .prepare(
            `
          UPDATE people SET department_id = ?, updated_at = ? WHERE id = ?
        `
          )
          .run(targetDepartmentId, now, personId);

        if (result.changes > 0) {
          const updatedPerson = {
            ...person,
            departmentId: targetDepartmentId,
            departmentName: targetDept.name,
          };
          moved.push(updatedPerson);
          // Emit event (also creates audit log)
          emitPersonUpdated(orgId, updatedPerson as unknown as Record<string, unknown>, actor);
        } else {
          failed.push({ id: personId, error: 'Failed to move' });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ id: personId, error: errorMessage });
      }
    }
  });

  moveTransaction();

  return {
    success: moved.length > 0,
    moved,
    failed,
    movedCount: moved.length,
    failedCount: failed.length,
  };
}

/**
 * Bulk edit people fields
 */
export function bulkEditPeople(
  orgId: string,
  personIds: string[],
  updates: PersonUpdates,
  actor: Actor
): BulkEditResult {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(personIds) || personIds.length === 0) {
    const error = new Error('personIds must be a non-empty array') as AppError;
    error.status = 400;
    throw error;
  }

  if (!updates || Object.keys(updates).length === 0) {
    const error = new Error('updates object is required and cannot be empty') as AppError;
    error.status = 400;
    throw error;
  }

  if (personIds.length > 100) {
    const error = new Error('Cannot edit more than 100 items at once') as AppError;
    error.status = 400;
    throw error;
  }

  const { title, departmentId } = updates;

  // If moving to new department, verify it exists
  let targetDept: { id: string; name: string } | null = null;
  if (departmentId) {
    const dept = db
      .prepare(
        `
      SELECT id, name FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
    `
      )
      .get(departmentId, orgId) as { id: string; name: string } | undefined;

    if (!dept) {
      const error = new Error('Target department not found in this organization') as AppError;
      error.status = 404;
      throw error;
    }
    targetDept = dept;
  }

  const updated: UpdatedPerson[] = [];
  const failed: FailedItem[] = [];
  const now = new Date().toISOString();

  const editTransaction = db.transaction(() => {
    for (const personId of personIds) {
      try {
        // Get current person data
        const person = db
          .prepare(
            `
          SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId,
                 d.organization_id, d.name as departmentName
          FROM people p
          JOIN departments d ON p.department_id = d.id
          WHERE p.id = ? AND d.organization_id = ? AND p.deleted_at IS NULL AND d.deleted_at IS NULL
        `
          )
          .get(personId, orgId) as UpdatedPerson | undefined;

        if (!person) {
          failed.push({ id: personId, error: 'Person not found in this organization' });
          continue;
        }

        // Build update query dynamically
        const updateFields: string[] = [];
        const updateValues: (string | undefined)[] = [];

        if (title !== undefined) {
          updateFields.push('title = ?');
          updateValues.push(title);
        }

        if (departmentId !== undefined) {
          updateFields.push('department_id = ?');
          updateValues.push(departmentId);
        }

        updateFields.push('updated_at = ?');
        updateValues.push(now);
        updateValues.push(personId);

        const result = db
          .prepare(
            `
          UPDATE people SET ${updateFields.join(', ')} WHERE id = ?
        `
          )
          .run(...updateValues);

        if (result.changes > 0) {
          const updatedPerson = {
            ...person,
            title: title !== undefined ? title : person.title,
            departmentId: departmentId !== undefined ? departmentId : person.departmentId,
            departmentName: targetDept ? targetDept.name : person.departmentName,
          };
          updated.push(updatedPerson);
          // Emit event (also creates audit log)
          emitPersonUpdated(orgId, updatedPerson as unknown as Record<string, unknown>, actor);
        } else {
          failed.push({ id: personId, error: 'Failed to update' });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ id: personId, error: errorMessage });
      }
    }
  });

  editTransaction();

  return {
    success: updated.length > 0,
    updated,
    failed,
    updatedCount: updated.length,
    failedCount: failed.length,
  };
}

/**
 * Bulk delete departments with warnings about child items
 */
export function bulkDeleteDepartments(
  orgId: string,
  departmentIds: string[],
  actor: Actor
): BulkDeleteDepartmentsResult {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
    const error = new Error('departmentIds must be a non-empty array') as AppError;
    error.status = 400;
    throw error;
  }

  if (departmentIds.length > 100) {
    const error = new Error('Cannot delete more than 100 items at once') as AppError;
    error.status = 400;
    throw error;
  }

  const deleted: DeletedDepartment[] = [];
  const failed: FailedItem[] = [];
  const warnings: string[] = [];

  const deleteTransaction = db.transaction(() => {
    for (const deptId of departmentIds) {
      try {
        // First check if department exists at all (even if soft-deleted)
        const deptCheck = db
          .prepare(
            `
          SELECT id, deleted_at FROM departments
          WHERE id = ? AND organization_id = ?
        `
          )
          .get(deptId, orgId) as { id: string; deleted_at: string | null } | undefined;

        if (!deptCheck) {
          failed.push({ id: deptId, error: 'Department not found in this organization' });
          continue;
        }

        // If already deleted (by cascade from parent department), skip silently
        if (deptCheck.deleted_at !== null) {
          continue;
        }

        // Get full department data before delete (for audit trail)
        const dept = db
          .prepare(
            `
          SELECT id, name, description, parent_id as parentId, organization_id
          FROM departments
          WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
        `
          )
          .get(deptId, orgId) as DeletedDepartment | undefined;

        if (!dept) {
          // This shouldn't happen since we just checked, but handle it anyway
          failed.push({ id: deptId, error: 'Department not found in this organization' });
          continue;
        }

        // Check for child departments (will be cascade deleted)
        const childCount = (
          db
            .prepare(
              `
          SELECT COUNT(*) as count FROM departments WHERE parent_id = ? AND deleted_at IS NULL
        `
            )
            .get(deptId) as CountResult
        ).count;

        if (childCount > 0) {
          warnings.push(
            `Department '${dept.name}' had ${childCount} sub-department(s) that were also deleted`
          );
        }

        // Check for people (will be cascade deleted)
        const peopleCount = (
          db
            .prepare(
              `
          SELECT COUNT(*) as count FROM people WHERE department_id = ? AND deleted_at IS NULL
        `
            )
            .get(deptId) as CountResult
        ).count;

        if (peopleCount > 0) {
          warnings.push(
            `Department '${dept.name}' had ${peopleCount} person(s) that were also deleted`
          );
        }

        // Soft delete the department and its children/people
        const { changes } = softDeleteDepartment(deptId);

        if (changes > 0) {
          deleted.push(dept);
          // Emit event (also creates audit log)
          emitDepartmentDeleted(orgId, dept as unknown as Record<string, unknown>, actor);
        } else {
          failed.push({ id: deptId, error: 'Failed to delete' });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ id: deptId, error: errorMessage });
      }
    }
  });

  deleteTransaction();

  return {
    success: deleted.length > 0,
    deleted,
    failed,
    warnings,
    deletedCount: deleted.length,
    failedCount: failed.length,
  };
}

/**
 * Bulk edit departments (mainly for re-parenting)
 */
export function bulkEditDepartments(
  orgId: string,
  departmentIds: string[],
  updates: DepartmentUpdates,
  actor: Actor
): BulkEditResult {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
    const error = new Error('departmentIds must be a non-empty array') as AppError;
    error.status = 400;
    throw error;
  }

  if (!updates || Object.keys(updates).length === 0) {
    const error = new Error('updates object is required and cannot be empty') as AppError;
    error.status = 400;
    throw error;
  }

  if (departmentIds.length > 100) {
    const error = new Error('Cannot edit more than 100 items at once') as AppError;
    error.status = 400;
    throw error;
  }

  const { parentId } = updates;

  // If setting a parent, verify it exists and belongs to this org
  if (parentId !== null && parentId !== undefined) {
    const parentDept = db
      .prepare(
        `
      SELECT id, name FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
    `
      )
      .get(parentId, orgId) as { id: string; name: string } | undefined;

    if (!parentDept) {
      const error = new Error('Parent department not found in this organization') as AppError;
      error.status = 404;
      throw error;
    }

    // Check for circular references - none of the departments being edited can be the parent
    if (departmentIds.includes(parentId)) {
      const error = new Error('Cannot set a department as its own parent') as AppError;
      error.status = 400;
      throw error;
    }
  }

  const updated: UpdatedDepartment[] = [];
  const failed: FailedItem[] = [];
  const now = new Date().toISOString();

  const editTransaction = db.transaction(() => {
    for (const deptId of departmentIds) {
      try {
        // Get current department data
        const dept = db
          .prepare(
            `
          SELECT id, name, description, parent_id as parentId, organization_id
          FROM departments
          WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
        `
          )
          .get(deptId, orgId) as UpdatedDepartment | undefined;

        if (!dept) {
          failed.push({ id: deptId, error: 'Department not found in this organization' });
          continue;
        }

        // Check for circular reference - can't set parent to self or a descendant
        if (parentId) {
          // Check if parentId is a descendant of deptId
          const isDescendant = checkIsDescendant(parentId, deptId);
          if (isDescendant) {
            failed.push({ id: deptId, error: 'Cannot set parent to a descendant department' });
            continue;
          }
        }

        // Update the department
        const result = db
          .prepare(
            `
          UPDATE departments SET parent_id = ?, updated_at = ? WHERE id = ?
        `
          )
          .run(parentId === undefined ? dept.parentId : parentId, now, deptId);

        if (result.changes > 0) {
          const updatedDept = {
            ...dept,
            parentId: parentId === undefined ? dept.parentId : parentId,
          };
          updated.push(updatedDept);
          // Emit event (also creates audit log)
          emitDepartmentUpdated(orgId, updatedDept as unknown as Record<string, unknown>, actor);
        } else {
          failed.push({ id: deptId, error: 'Failed to update' });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ id: deptId, error: errorMessage });
      }
    }
  });

  editTransaction();

  return {
    success: updated.length > 0,
    updated,
    failed,
    updatedCount: updated.length,
    failedCount: failed.length,
  };
}

/**
 * Helper to check if potentialDescendant is a descendant of ancestorId
 */
function checkIsDescendant(potentialDescendant: string, ancestorId: string): boolean {
  let current: string | null | undefined = potentialDescendant;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) break; // Prevent infinite loops
    visited.add(current);

    if (current === ancestorId) return true;

    const parent = db
      .prepare('SELECT parent_id FROM departments WHERE id = ? AND deleted_at IS NULL')
      .get(current) as { parent_id: string | null } | undefined;
    current = parent?.parent_id;
  }

  return false;
}

/**
 * Helper to soft delete a department and its children
 */
function softDeleteDepartment(deptId: string): { changes: number } {
  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    let totalChanges = 0;

    // Find all child departments recursively
    const allDeptsToDelete: string[] = [deptId];
    let currentDeptIds: string[] = [deptId];

    while (currentDeptIds.length > 0) {
      const children = (
        db
          .prepare(
            `
        SELECT id FROM departments
        WHERE parent_id IN (${currentDeptIds.map(() => '?').join(',')}) AND deleted_at IS NULL
      `
          )
          .all(currentDeptIds) as Array<{ id: string }>
      ).map(d => d.id);

      if (children.length > 0) {
        allDeptsToDelete.push(...children);
        currentDeptIds = children;
      } else {
        currentDeptIds = [];
      }
    }

    // Soft delete all affected departments
    const deptResult = db
      .prepare(
        `
      UPDATE departments
      SET deleted_at = ?, updated_at = ?
      WHERE id IN (${allDeptsToDelete.map(() => '?').join(',')})
    `
      )
      .run(now, now, ...allDeptsToDelete);
    totalChanges += deptResult.changes;

    // Soft delete all people in those departments
    const peopleResult = db
      .prepare(
        `
      UPDATE people
      SET deleted_at = ?, updated_at = ?
      WHERE department_id IN (${allDeptsToDelete.map(() => '?').join(',')})
    `
      )
      .run(now, now, ...allDeptsToDelete);
    totalChanges += peopleResult.changes;

    return { changes: totalChanges };
  });

  return transaction();
}
