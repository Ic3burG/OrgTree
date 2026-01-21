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
