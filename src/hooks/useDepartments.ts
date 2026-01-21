import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import type { Department, CustomFieldDefinition } from '../types';

interface UseDepartmentsReturn {
  departments: Department[];
  fieldDefinitions: CustomFieldDefinition[];
  loading: boolean;
  error: string | null;
  loadDepartments: (showLoading?: boolean) => Promise<void>;
  createDepartment: (data: Partial<Department>) => Promise<void>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

export function useDepartments(orgId: string | undefined): UseDepartmentsReturn {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = useCallback(
    async (showLoading = true): Promise<void> => {
      if (!orgId) return;
      try {
        if (showLoading) setLoading(true);
        const [data, defs] = await Promise.all([
          api.getDepartments(orgId),
          api.getCustomFieldDefinitions(orgId),
        ]);
        setDepartments(data);
        setFieldDefinitions(defs.filter(d => d.entity_type === 'department'));
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const createDepartment = async (data: Partial<Department>): Promise<void> => {
    if (!orgId) return;
    await api.createDepartment(orgId, data);
    await loadDepartments(false);
  };

  const updateDepartment = async (id: string, data: Partial<Department>): Promise<void> => {
    if (!orgId) return;
    await api.updateDepartment(orgId, id, data);
    await loadDepartments(false);
  };

  const deleteDepartment = async (id: string): Promise<void> => {
    if (!orgId) return;
    await api.deleteDepartment(orgId, id);
    await loadDepartments(false);
  };

  return {
    departments,
    fieldDefinitions,
    loading,
    error,
    loadDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
