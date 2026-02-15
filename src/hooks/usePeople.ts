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

import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import type { Person, Department, Organization, CustomFieldDefinition } from '../types';

export interface PersonWithDepartmentName extends Person {
  departmentName?: string;
}

interface UsePeopleReturn {
  people: PersonWithDepartmentName[];
  departments: Department[];
  fieldDefinitions: CustomFieldDefinition[];
  loading: boolean;
  error: string | null;
  loadData: (showLoading?: boolean) => Promise<void>;
  createPerson: (deptId: string, data: Partial<Person>) => Promise<void>;
  updatePerson: (id: string, data: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
}

export function usePeople(orgId: string | undefined): UsePeopleReturn {
  const [people, setPeople] = useState<PersonWithDepartmentName[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (showLoading = true): Promise<void> => {
      if (!orgId) return;
      try {
        if (showLoading) setLoading(true);
        setError(null);

        // Load organization with all departments and people
        const orgData = (await api.getOrganization(orgId)) as Organization & {
          departments?: Department[];
        };
        setDepartments(orgData.departments || []);

        // Load custom field definitions
        const defs = await api.getCustomFieldDefinitions(orgId);
        setFieldDefinitions(defs.filter(d => d.entity_type === 'person'));

        // Flatten people
        const allPeople: PersonWithDepartmentName[] = [];
        (orgData.departments || []).forEach((dept: Department) => {
          (dept.people || []).forEach((person: Person) => {
            allPeople.push({
              ...person,
              departmentName: dept.name,
            });
          });
        });
        setPeople(allPeople);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createPerson = async (deptId: string, data: Partial<Person>): Promise<void> => {
    await api.createPerson(deptId, data);
    await loadData(false);
  };

  const updatePerson = async (id: string, data: Partial<Person>): Promise<void> => {
    await api.updatePerson(id, data);
    await loadData(false);
  };

  const deletePerson = async (id: string): Promise<void> => {
    await api.deletePerson(id);
    await loadData(false);
  };

  return {
    people,
    departments,
    fieldDefinitions,
    loading,
    error,
    loadData,
    createPerson,
    updatePerson,
    deletePerson,
  };
}
