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
import type { AuthRequest } from '../types/index.js';
import {
  acceptTransfer,
  rejectTransfer,
  cancelTransfer,
  getTransferById,
  getPendingTransfersForUser,
  getAuditLog,
} from '../services/ownership-transfer.service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

//  GET /api/ownership/transfers/pending
// Get pending transfers for current user (where they are the recipient)
router.get(
  '/ownership/transfers/pending',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transfers = await getPendingTransfersForUser(req.user!.id);
      res.json(transfers);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ownership/transfers/:transferId/accept
// Accept ownership transfer
router.post(
  '/ownership/transfers/:transferId/accept',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transferId } = req.params;
      const ipAddress = req.ip || null;
      const userAgent = req.get('user-agent') || null;

      const transfer = acceptTransfer(transferId!, req.user!.id, ipAddress, userAgent);

      res.json({
        success: true,
        transfer,
        message:
          'Ownership transfer accepted successfully. You are now the owner of this organization.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ownership/transfers/:transferId/reject
// Reject ownership transfer
router.post(
  '/ownership/transfers/:transferId/reject',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transferId } = req.params;
      const { reason } = req.body;
      const ipAddress = req.ip || null;
      const userAgent = req.get('user-agent') || null;

      const transfer = rejectTransfer(transferId!, req.user!.id, reason, ipAddress, userAgent);

      res.json({
        success: true,
        transfer,
        message: 'Ownership transfer rejected',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ownership/transfers/:transferId/cancel
// Cancel pending ownership transfer
router.post(
  '/ownership/transfers/:transferId/cancel',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transferId } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        res.status(400).json({ message: 'Cancellation reason is required' });
        return;
      }

      // We track IP and user agent for security audit logging
      const ipAddress = req.ip || null;
      const userAgent = req.get('user-agent') || null;

      const transfer = cancelTransfer(transferId!, req.user!.id, reason, ipAddress, userAgent);

      res.json({
        success: true,
        transfer,
        message: 'Ownership transfer cancelled',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/ownership/transfers/:transferId/audit-log
// Get audit log for a transfer
router.get(
  '/ownership/transfers/:transferId/audit-log',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transferId } = req.params;
      const auditLog = getAuditLog(transferId!, req.user!.id);

      res.json(auditLog);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/ownership/transfers/:transferId
// Get transfer details by ID
router.get(
  '/ownership/transfers/:transferId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transferId } = req.params;
      const transfer = getTransferById(transferId!, req.user!.id);

      res.json(transfer);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
