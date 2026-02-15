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
