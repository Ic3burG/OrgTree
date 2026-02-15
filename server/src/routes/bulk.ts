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
  bulkDeletePeople,
  bulkMovePeople,
  bulkEditPeople,
  bulkDeleteDepartments,
  bulkEditDepartments,
} from '../services/bulk.service.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

// Security: Maximum items per bulk operation
const MAX_BULK_SIZE = 100;

// Helper to validate array input
function validateBulkArray(arr: unknown, fieldName: string): { valid: boolean; message?: string } {
  if (!arr || !Array.isArray(arr)) {
    return { valid: false, message: `${fieldName} array is required` };
  }
  if (arr.length === 0) {
    return { valid: false, message: `${fieldName} array cannot be empty` };
  }
  if (arr.length > MAX_BULK_SIZE) {
    return {
      valid: false,
      message: `${fieldName} exceeds maximum limit of ${MAX_BULK_SIZE} items`,
    };
  }
  return { valid: true };
}

// ==================== PEOPLE BULK OPERATIONS ====================

// POST /api/organizations/:orgId/people/bulk-delete
// Delete multiple people
router.post(
  '/organizations/:orgId/people/bulk-delete',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { personIds } = req.body;

      const validation = validateBulkArray(personIds, 'personIds');
      if (!validation.valid) {
        res.status(400).json({ message: validation.message });
        return;
      }

      const result = bulkDeletePeople(orgId!, personIds, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:orgId/people/bulk-move
// Move multiple people to a different department
router.post(
  '/organizations/:orgId/people/bulk-move',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { personIds, targetDepartmentId } = req.body;

      const validation = validateBulkArray(personIds, 'personIds');
      if (!validation.valid) {
        res.status(400).json({ message: validation.message });
        return;
      }

      if (!targetDepartmentId) {
        res.status(400).json({ message: 'targetDepartmentId is required' });
        return;
      }

      const result = bulkMovePeople(orgId!, personIds, targetDepartmentId, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:orgId/people/bulk-edit
// Edit fields on multiple people
router.put(
  '/organizations/:orgId/people/bulk-edit',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { personIds, updates } = req.body;

      const validation = validateBulkArray(personIds, 'personIds');
      if (!validation.valid) {
        res.status(400).json({ message: validation.message });
        return;
      }

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({ message: 'updates object is required' });
        return;
      }

      // Security: Whitelist allowed fields to prevent mass assignment
      const allowedPersonFields = ['title', 'departmentId', 'email', 'phone', 'customFields'];
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedPersonFields.includes(key))
      );

      if (Object.keys(sanitizedUpdates).length === 0) {
        res.status(400).json({
          message: `No valid update fields provided. Allowed: ${allowedPersonFields.join(', ')}`,
        });
        return;
      }

      const result = await bulkEditPeople(orgId!, personIds, sanitizedUpdates, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ==================== DEPARTMENT BULK OPERATIONS ====================

// POST /api/organizations/:orgId/departments/bulk-delete
// Delete multiple departments
router.post(
  '/organizations/:orgId/departments/bulk-delete',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { departmentIds } = req.body;

      const validation = validateBulkArray(departmentIds, 'departmentIds');
      if (!validation.valid) {
        res.status(400).json({ message: validation.message });
        return;
      }

      const result = bulkDeleteDepartments(orgId!, departmentIds, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:orgId/departments/bulk-edit
// Edit fields on multiple departments (mainly re-parenting)
router.put(
  '/organizations/:orgId/departments/bulk-edit',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const { departmentIds, updates } = req.body;

      const validation = validateBulkArray(departmentIds, 'departmentIds');
      if (!validation.valid) {
        res.status(400).json({ message: validation.message });
        return;
      }

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({ message: 'updates object is required' });
        return;
      }

      // Security: Whitelist allowed fields to prevent mass assignment
      const allowedDeptFields = ['parentId', 'name', 'description'];
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedDeptFields.includes(key))
      );

      if (Object.keys(sanitizedUpdates).length === 0) {
        res.status(400).json({
          message: `No valid update fields provided. Allowed: ${allowedDeptFields.join(', ')}`,
        });
        return;
      }

      const result = bulkEditDepartments(orgId!, departmentIds, sanitizedUpdates, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
