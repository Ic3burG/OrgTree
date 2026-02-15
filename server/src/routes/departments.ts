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

import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../services/department.service.js';
import {
  emitDepartmentCreated,
  emitDepartmentUpdated,
  emitDepartmentDeleted,
} from '../services/socket-events.service.js';
import db from '../db.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/organizations/:orgId/departments
router.get(
  '/organizations/:orgId/departments',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const depts = await getDepartments(req.params.orgId!, req.user!.id);
      res.json(depts);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/organizations/:orgId/departments/:deptId
router.get(
  '/organizations/:orgId/departments/:deptId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dept = await getDepartmentById(req.params.orgId!, req.params.deptId!, req.user!.id);
      res.json(dept);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:orgId/departments
router.post(
  '/organizations/:orgId/departments',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, parentId, customFields } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ message: 'Department name is required' });
        return;
      }

      const dept = await createDepartment(
        req.params.orgId!,
        {
          name: name.trim(),
          description: description !== undefined ? String(description) : undefined,
          parentId: parentId !== undefined && parentId !== null ? String(parentId) : null,
          customFields,
        },
        req.user!.id
      );

      // Emit real-time event
      emitDepartmentCreated(
        req.params.orgId!,
        dept as unknown as Record<string, unknown>,
        req.user!
      );

      res.status(201).json(dept);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:orgId/departments/:deptId
router.put(
  '/organizations/:orgId/departments/:deptId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, parentId, customFields } = req.body;

      if (name !== undefined && !name.trim()) {
        res.status(400).json({ message: 'Department name cannot be empty' });
        return;
      }

      const dept = await updateDepartment(
        req.params.orgId!,
        req.params.deptId!,
        {
          name: name?.trim(),
          description: description !== undefined ? String(description) : undefined,
          parentId: parentId !== undefined && parentId !== null ? String(parentId) : null,
          customFields,
        },
        req.user!.id
      );

      // Emit real-time event
      emitDepartmentUpdated(
        req.params.orgId!,
        dept as unknown as Record<string, unknown>,
        req.user!
      );

      res.json(dept);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/organizations/:orgId/departments/:deptId
router.delete(
  '/organizations/:orgId/departments/:deptId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get full department data before deleting for audit trail
      const department = db
        .prepare(
          `
      SELECT id, name, description, parent_id as parentId, organization_id
      FROM departments
      WHERE id = ? AND organization_id = ?
    `
        )
        .get(req.params.deptId!, req.params.orgId!) as
        | {
            id: string;
            name: string;
            description: string | null;
            parentId: string | null;
            organization_id: string;
          }
        | undefined;

      await deleteDepartment(req.params.orgId!, req.params.deptId!, req.user!.id);

      // Emit real-time event with full department data
      if (department) {
        emitDepartmentDeleted(req.params.orgId!, department, req.user!);
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
