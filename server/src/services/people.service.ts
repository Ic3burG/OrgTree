/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import db from '../db.js';
import { randomUUID } from 'crypto';
import { requireOrgPermission } from './member.service.js';
import type { DatabaseDepartment, DatabasePerson, AppError } from '../types/index.js';
import { getCustomHeaderFields, setEntityCustomFields } from './custom-fields.service.js';

interface DepartmentWithOrg extends DatabaseDepartment {
  organizationId: string;
}

// Helper to verify department access through org permissions
function verifyDeptAccess(
  deptId: string,
  userId: string,
  minRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'
): DepartmentWithOrg {
  const dept = db
    .prepare(
      `
    SELECT d.*, d.organization_id as organizationId
    FROM departments d
    WHERE d.id = ? AND d.deleted_at IS NULL
  `
    )
    .get(deptId) as DepartmentWithOrg | undefined;

  if (!dept) {
    const error = new Error('Department not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check org permission
  requireOrgPermission(dept.organizationId, userId, minRole);

  return dept;
}

interface PersonResponse {
  id: string;
  department_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_starred: number;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, unknown>;
}

export function getPeopleByDepartment(deptId: string, userId: string): PersonResponse[] {
  verifyDeptAccess(deptId, userId, 'viewer');

  return db
    .prepare(
      `
    SELECT
      id, department_id, name, title, email, phone,
      sort_order, is_starred, created_at, updated_at
    FROM people
    WHERE department_id = ? AND deleted_at IS NULL
    ORDER BY is_starred DESC, sort_order ASC
  `
    )
    .all(deptId) as PersonResponse[];
}

interface PersonWithDepartment extends PersonResponse {
  department: {
    id: string;
    name: string;
    organizationId: string;
    organization: {
      id: string;
      name: string;
      createdById: string;
    };
  };
}

export function getPersonById(personId: string, userId: string): PersonWithDepartment {
  const person = db
    .prepare(
      `
    SELECT
      p.id, p.department_id, p.name, p.title, p.email, p.phone,
      p.sort_order, p.is_starred, p.created_at, p.updated_at,
      d.name as departmentName, d.organization_id as organizationId,
      o.name as organizationName, o.created_by_id as orgCreatedBy
    FROM people p
    JOIN departments d ON p.department_id = d.id
    JOIN organizations o ON d.organization_id = o.id
    WHERE p.id = ? AND p.deleted_at IS NULL
  `
    )
    .get(personId) as
    | (PersonResponse & {
        departmentName: string;
        organizationId: string;
        organizationName: string;
        orgCreatedBy: string;
      })
    | undefined;

  if (!person) {
    const error = new Error('Person not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check org permission
  requireOrgPermission(person.organizationId, userId, 'viewer');

  // Clean up the response to match expected format
  const { departmentName, organizationId, organizationName, orgCreatedBy, ...personData } = person;

  // Fetch custom fields
  const customFields = getCustomHeaderFields('person', person.id);

  const result: PersonWithDepartment = {
    ...personData,
    custom_fields: customFields,
    department: {
      id: person.department_id,
      name: departmentName,
      organizationId,
      organization: {
        id: organizationId,
        name: organizationName,
        createdById: orgCreatedBy,
      },
    },
  };

  return result;
}

export async function createPerson(
  deptId: string,
  data: {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
    isStarred?: boolean;
    customFields?: Record<string, unknown>;
  },
  userId: string
): Promise<PersonResponse> {
  const dept = verifyDeptAccess(deptId, userId, 'editor');

  const { name, title, email, phone, isStarred, customFields } = data;

  // Check for duplicates
  if (email && email.trim()) {
    // Check if email already exists in organization (case-insensitive, whitespace-tolerant)
    const existingByEmail = db
      .prepare(
        `
      SELECT p.id
      FROM people p
      JOIN departments d ON p.department_id = d.id
      WHERE d.organization_id = ?
      AND LOWER(TRIM(p.email)) = LOWER(TRIM(?))
      AND p.deleted_at IS NULL
    `
      )
      .get(dept.organizationId, email.trim()) as { id: string } | undefined;

    if (existingByEmail) {
      const error = new Error(
        'A person with this email already exists in this organization'
      ) as AppError;
      error.status = 400;
      throw error;
    }
  } else {
    // If no email, check if name already exists in department (case-insensitive, whitespace-tolerant)
    const existingByName = db
      .prepare(
        `
      SELECT id FROM people
      WHERE department_id = ?
      AND LOWER(TRIM(name)) = LOWER(TRIM(?))
      AND deleted_at IS NULL
    `
      )
      .get(deptId, name.trim()) as { id: string } | undefined;

    if (existingByName) {
      const error = new Error(
        'A person with this name already exists in this department'
      ) as AppError;
      error.status = 400;
      throw error;
    }
  }

  // Get max sortOrder (only from non-deleted people)
  const maxSortResult = db
    .prepare(
      `
    SELECT MAX(sort_order) as maxSort
    FROM people
    WHERE department_id = ? AND deleted_at IS NULL
  `
    )
    .get(deptId) as { maxSort: number | null } | undefined;

  const sortOrder = (maxSortResult?.maxSort || 0) + 1;
  const personId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO people (id, department_id, name, title, email, phone, sort_order, is_starred, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    personId,
    deptId,
    name,
    title || null,
    email || null,
    phone || null,
    sortOrder,
    isStarred ? 1 : 0,
    now,
    now
  );

  // Save custom fields if provided
  if (customFields) {
    await setEntityCustomFields(dept.organizationId, 'person', personId, customFields);
  }

  const createdPerson = db
    .prepare(
      `
    SELECT
      id, department_id, name, title, email, phone,
      sort_order, is_starred, created_at, updated_at
    FROM people
    WHERE id = ?
  `
    )
    .get(personId) as PersonResponse;

  if (customFields) {
    createdPerson.custom_fields = customFields;
  }

  return createdPerson;
}

export async function updatePerson(
  personId: string,
  data: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    departmentId?: string;
    isStarred?: boolean;
    customFields?: Record<string, unknown>;
  },
  userId: string
): Promise<PersonResponse> {
  const person = getPersonById(personId, userId);

  const { name, title, email, phone, departmentId, isStarred, customFields } = data;

  // If moving to new department, verify access to that department
  if (departmentId && departmentId !== person.department_id) {
    verifyDeptAccess(departmentId, userId, 'editor');
  }

  const now = new Date().toISOString();

  // Get current person data
  const currentPerson = db
    .prepare('SELECT * FROM people WHERE id = ? AND deleted_at IS NULL')
    .get(personId) as DatabasePerson | undefined;
  if (!currentPerson) {
    const error = new Error('Person not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check for duplicates if email is being changed
  if (email !== undefined && email && email.trim()) {
    const existingByEmail = db
      .prepare(
        `
      SELECT p.id
      FROM people p
      JOIN departments d ON p.department_id = d.id
      WHERE d.organization_id = ?
      AND LOWER(TRIM(p.email)) = LOWER(TRIM(?))
      AND p.id != ?
      AND p.deleted_at IS NULL
    `
      )
      .get(person.department.organizationId, email.trim(), personId) as { id: string } | undefined;

    if (existingByEmail) {
      const error = new Error(
        'A person with this email already exists in this organization'
      ) as AppError;
      error.status = 400;
      throw error;
    }
  }

  // Check for duplicate names if name is being changed and there's no email
  const finalEmail = email !== undefined ? email : currentPerson.email;
  const finalName = name !== undefined ? name : currentPerson.name;
  const finalDeptId = departmentId !== undefined ? departmentId : currentPerson.department_id;

  if (name !== undefined && (!finalEmail || !finalEmail.trim())) {
    const existingByName = db
      .prepare(
        `
      SELECT id FROM people
      WHERE department_id = ?
      AND LOWER(TRIM(name)) = LOWER(TRIM(?))
      AND id != ?
      AND deleted_at IS NULL
    `
      )
      .get(finalDeptId, finalName.trim(), personId) as { id: string } | undefined;

    if (existingByName) {
      const error = new Error(
        'A person with this name already exists in this department'
      ) as AppError;
      error.status = 400;
      throw error;
    }
  }

  db.prepare(
    `
    UPDATE people
    SET
      name = ?,
      title = ?,
      email = ?,
      phone = ?,
      department_id = ?,
      is_starred = ?,
      updated_at = ?
    WHERE id = ?
  `
  ).run(
    name !== undefined ? name : currentPerson.name,
    title !== undefined ? title : currentPerson.title,
    email !== undefined ? email : currentPerson.email,
    phone !== undefined ? phone : currentPerson.phone,
    departmentId !== undefined ? departmentId : currentPerson.department_id,
    isStarred !== undefined ? (isStarred ? 1 : 0) : currentPerson.is_starred,
    now,
    personId
  );

  // Update custom fields if provided
  if (customFields) {
    await setEntityCustomFields(person.department.organizationId, 'person', personId, customFields);
  }

  const updatedPerson = db
    .prepare(
      `
    SELECT
      id, department_id, name, title, email, phone,
      sort_order, is_starred, created_at, updated_at
    FROM people
    WHERE id = ?
  `
    )
    .get(personId) as PersonResponse;

  // Attach custom fields to response
  updatedPerson.custom_fields = getCustomHeaderFields('person', personId);

  return updatedPerson;
}

export function deletePerson(personId: string, userId: string): { success: boolean } {
  getPersonById(personId, userId); // Verifies access and that person exists

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE people
    SET deleted_at = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(now, now, personId);

  return { success: true };
}

export async function movePerson(
  personId: string,
  newDeptId: string,
  userId: string
): Promise<PersonResponse> {
  return updatePerson(personId, { departmentId: newDeptId }, userId);
}
