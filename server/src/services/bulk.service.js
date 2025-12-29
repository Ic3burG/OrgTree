import db from '../db.js';
import { requireOrgPermission } from './member.service.js';
import {
  emitPersonDeleted,
  emitPersonUpdated,
  emitDepartmentDeleted,
  emitDepartmentUpdated
} from './socket-events.service.js';

/**
 * Bulk delete people with individual audit logs for each
 * @param {string} orgId - Organization ID
 * @param {string[]} personIds - Array of person IDs to delete
 * @param {Object} actor - User performing the action (with id and name)
 * @returns {{ deleted: Object[], failed: {id: string, error: string}[], deletedCount: number, failedCount: number }}
 */
export function bulkDeletePeople(orgId, personIds, actor) {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(personIds) || personIds.length === 0) {
    const error = new Error('personIds must be a non-empty array');
    error.status = 400;
    throw error;
  }

  if (personIds.length > 100) {
    const error = new Error('Cannot delete more than 100 items at once');
    error.status = 400;
    throw error;
  }

  const deleted = [];
  const failed = [];

  // Use transaction for atomicity
  const deleteTransaction = db.transaction(() => {
    for (const personId of personIds) {
      try {
        // Get full person data before delete (for audit trail)
        const person = db.prepare(`
          SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId,
                 d.organization_id, d.name as departmentName
          FROM people p
          JOIN departments d ON p.department_id = d.id
          WHERE p.id = ? AND d.organization_id = ?
        `).get(personId, orgId);

        if (!person) {
          failed.push({ id: personId, error: 'Person not found in this organization' });
          continue;
        }

        // Delete the person
        const result = db.prepare('DELETE FROM people WHERE id = ?').run(personId);

        if (result.changes > 0) {
          deleted.push(person);
          // Emit event (also creates audit log)
          emitPersonDeleted(orgId, person, actor);
        } else {
          failed.push({ id: personId, error: 'Failed to delete' });
        }
      } catch (err) {
        failed.push({ id: personId, error: err.message });
      }
    }
  });

  deleteTransaction();

  return {
    success: deleted.length > 0,
    deleted,
    failed,
    deletedCount: deleted.length,
    failedCount: failed.length
  };
}

/**
 * Bulk move people to a different department
 * @param {string} orgId - Organization ID
 * @param {string[]} personIds - Array of person IDs to move
 * @param {string} targetDepartmentId - Target department ID
 * @param {Object} actor - User performing the action
 * @returns {{ moved: Object[], failed: {id: string, error: string}[], movedCount: number, failedCount: number }}
 */
export function bulkMovePeople(orgId, personIds, targetDepartmentId, actor) {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(personIds) || personIds.length === 0) {
    const error = new Error('personIds must be a non-empty array');
    error.status = 400;
    throw error;
  }

  if (!targetDepartmentId) {
    const error = new Error('targetDepartmentId is required');
    error.status = 400;
    throw error;
  }

  if (personIds.length > 100) {
    const error = new Error('Cannot move more than 100 items at once');
    error.status = 400;
    throw error;
  }

  // Verify target department exists and belongs to this org
  const targetDept = db.prepare(`
    SELECT id, name FROM departments WHERE id = ? AND organization_id = ?
  `).get(targetDepartmentId, orgId);

  if (!targetDept) {
    const error = new Error('Target department not found in this organization');
    error.status = 404;
    throw error;
  }

  const moved = [];
  const failed = [];
  const now = new Date().toISOString();

  const moveTransaction = db.transaction(() => {
    for (const personId of personIds) {
      try {
        // Verify person exists and belongs to this org
        const person = db.prepare(`
          SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId,
                 d.organization_id, d.name as departmentName
          FROM people p
          JOIN departments d ON p.department_id = d.id
          WHERE p.id = ? AND d.organization_id = ?
        `).get(personId, orgId);

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
        const result = db.prepare(`
          UPDATE people SET department_id = ?, updated_at = ? WHERE id = ?
        `).run(targetDepartmentId, now, personId);

        if (result.changes > 0) {
          const updatedPerson = {
            ...person,
            departmentId: targetDepartmentId,
            departmentName: targetDept.name
          };
          moved.push(updatedPerson);
          // Emit event (also creates audit log)
          emitPersonUpdated(orgId, updatedPerson, actor);
        } else {
          failed.push({ id: personId, error: 'Failed to move' });
        }
      } catch (err) {
        failed.push({ id: personId, error: err.message });
      }
    }
  });

  moveTransaction();

  return {
    success: moved.length > 0,
    moved,
    failed,
    movedCount: moved.length,
    failedCount: failed.length
  };
}

/**
 * Bulk edit people fields
 * @param {string} orgId - Organization ID
 * @param {string[]} personIds - Array of person IDs to edit
 * @param {Object} updates - Fields to update (title, departmentId)
 * @param {Object} actor - User performing the action
 * @returns {{ updated: Object[], failed: {id: string, error: string}[], updatedCount: number, failedCount: number }}
 */
export function bulkEditPeople(orgId, personIds, updates, actor) {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(personIds) || personIds.length === 0) {
    const error = new Error('personIds must be a non-empty array');
    error.status = 400;
    throw error;
  }

  if (!updates || Object.keys(updates).length === 0) {
    const error = new Error('updates object is required and cannot be empty');
    error.status = 400;
    throw error;
  }

  if (personIds.length > 100) {
    const error = new Error('Cannot edit more than 100 items at once');
    error.status = 400;
    throw error;
  }

  const { title, departmentId } = updates;

  // If moving to new department, verify it exists
  let targetDept = null;
  if (departmentId) {
    targetDept = db.prepare(`
      SELECT id, name FROM departments WHERE id = ? AND organization_id = ?
    `).get(departmentId, orgId);

    if (!targetDept) {
      const error = new Error('Target department not found in this organization');
      error.status = 404;
      throw error;
    }
  }

  const updated = [];
  const failed = [];
  const now = new Date().toISOString();

  const editTransaction = db.transaction(() => {
    for (const personId of personIds) {
      try {
        // Get current person data
        const person = db.prepare(`
          SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId,
                 d.organization_id, d.name as departmentName
          FROM people p
          JOIN departments d ON p.department_id = d.id
          WHERE p.id = ? AND d.organization_id = ?
        `).get(personId, orgId);

        if (!person) {
          failed.push({ id: personId, error: 'Person not found in this organization' });
          continue;
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

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

        const result = db.prepare(`
          UPDATE people SET ${updateFields.join(', ')} WHERE id = ?
        `).run(...updateValues);

        if (result.changes > 0) {
          const updatedPerson = {
            ...person,
            title: title !== undefined ? title : person.title,
            departmentId: departmentId !== undefined ? departmentId : person.departmentId,
            departmentName: targetDept ? targetDept.name : person.departmentName
          };
          updated.push(updatedPerson);
          // Emit event (also creates audit log)
          emitPersonUpdated(orgId, updatedPerson, actor);
        } else {
          failed.push({ id: personId, error: 'Failed to update' });
        }
      } catch (err) {
        failed.push({ id: personId, error: err.message });
      }
    }
  });

  editTransaction();

  return {
    success: updated.length > 0,
    updated,
    failed,
    updatedCount: updated.length,
    failedCount: failed.length
  };
}

/**
 * Bulk delete departments with warnings about child items
 * @param {string} orgId - Organization ID
 * @param {string[]} departmentIds - Array of department IDs to delete
 * @param {Object} actor - User performing the action
 * @returns {{ deleted: Object[], failed: {id: string, error: string}[], warnings: string[], deletedCount: number, failedCount: number }}
 */
export function bulkDeleteDepartments(orgId, departmentIds, actor) {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
    const error = new Error('departmentIds must be a non-empty array');
    error.status = 400;
    throw error;
  }

  if (departmentIds.length > 100) {
    const error = new Error('Cannot delete more than 100 items at once');
    error.status = 400;
    throw error;
  }

  const deleted = [];
  const failed = [];
  const warnings = [];

  const deleteTransaction = db.transaction(() => {
    for (const deptId of departmentIds) {
      try {
        // Get full department data before delete (for audit trail)
        const dept = db.prepare(`
          SELECT id, name, description, parent_id as parentId, organization_id
          FROM departments
          WHERE id = ? AND organization_id = ?
        `).get(deptId, orgId);

        if (!dept) {
          failed.push({ id: deptId, error: 'Department not found in this organization' });
          continue;
        }

        // Check for child departments (will be cascade deleted)
        const childCount = db.prepare(`
          SELECT COUNT(*) as count FROM departments WHERE parent_id = ?
        `).get(deptId).count;

        if (childCount > 0) {
          warnings.push(`Department '${dept.name}' had ${childCount} sub-department(s) that were also deleted`);
        }

        // Check for people (will be cascade deleted)
        const peopleCount = db.prepare(`
          SELECT COUNT(*) as count FROM people WHERE department_id = ?
        `).get(deptId).count;

        if (peopleCount > 0) {
          warnings.push(`Department '${dept.name}' had ${peopleCount} person(s) that were also deleted`);
        }

        // Delete the department (cascade will delete children and people)
        const result = db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);

        if (result.changes > 0) {
          deleted.push(dept);
          // Emit event (also creates audit log)
          emitDepartmentDeleted(orgId, dept, actor);
        } else {
          failed.push({ id: deptId, error: 'Failed to delete' });
        }
      } catch (err) {
        failed.push({ id: deptId, error: err.message });
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
    failedCount: failed.length
  };
}

/**
 * Bulk edit departments (mainly for re-parenting)
 * @param {string} orgId - Organization ID
 * @param {string[]} departmentIds - Array of department IDs to edit
 * @param {Object} updates - Fields to update (parentId)
 * @param {Object} actor - User performing the action
 * @returns {{ updated: Object[], failed: {id: string, error: string}[], updatedCount: number, failedCount: number }}
 */
export function bulkEditDepartments(orgId, departmentIds, updates, actor) {
  // Verify user has editor permission on org
  requireOrgPermission(orgId, actor.id, 'editor');

  // Validate input
  if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
    const error = new Error('departmentIds must be a non-empty array');
    error.status = 400;
    throw error;
  }

  if (!updates || Object.keys(updates).length === 0) {
    const error = new Error('updates object is required and cannot be empty');
    error.status = 400;
    throw error;
  }

  if (departmentIds.length > 100) {
    const error = new Error('Cannot edit more than 100 items at once');
    error.status = 400;
    throw error;
  }

  const { parentId } = updates;

  // If setting a parent, verify it exists and belongs to this org
  if (parentId !== null && parentId !== undefined) {
    const parentDept = db.prepare(`
      SELECT id, name FROM departments WHERE id = ? AND organization_id = ?
    `).get(parentId, orgId);

    if (!parentDept) {
      const error = new Error('Parent department not found in this organization');
      error.status = 404;
      throw error;
    }

    // Check for circular references - none of the departments being edited can be the parent
    if (departmentIds.includes(parentId)) {
      const error = new Error('Cannot set a department as its own parent');
      error.status = 400;
      throw error;
    }
  }

  const updated = [];
  const failed = [];
  const now = new Date().toISOString();

  const editTransaction = db.transaction(() => {
    for (const deptId of departmentIds) {
      try {
        // Get current department data
        const dept = db.prepare(`
          SELECT id, name, description, parent_id as parentId, organization_id
          FROM departments
          WHERE id = ? AND organization_id = ?
        `).get(deptId, orgId);

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
        const result = db.prepare(`
          UPDATE departments SET parent_id = ?, updated_at = ? WHERE id = ?
        `).run(parentId === undefined ? dept.parentId : parentId, now, deptId);

        if (result.changes > 0) {
          const updatedDept = {
            ...dept,
            parentId: parentId === undefined ? dept.parentId : parentId
          };
          updated.push(updatedDept);
          // Emit event (also creates audit log)
          emitDepartmentUpdated(orgId, updatedDept, actor);
        } else {
          failed.push({ id: deptId, error: 'Failed to update' });
        }
      } catch (err) {
        failed.push({ id: deptId, error: err.message });
      }
    }
  });

  editTransaction();

  return {
    success: updated.length > 0,
    updated,
    failed,
    updatedCount: updated.length,
    failedCount: failed.length
  };
}

/**
 * Helper to check if potentialDescendant is a descendant of ancestorId
 */
function checkIsDescendant(potentialDescendant, ancestorId) {
  let current = potentialDescendant;
  const visited = new Set();

  while (current) {
    if (visited.has(current)) break; // Prevent infinite loops
    visited.add(current);

    if (current === ancestorId) return true;

    const parent = db.prepare('SELECT parent_id FROM departments WHERE id = ?').get(current);
    current = parent?.parent_id;
  }

  return false;
}
