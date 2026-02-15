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
import { authenticateToken, requireSuperuser } from '../middleware/auth.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

interface OrgResult {
  id: string;
  name: string;
  created_by_id: string;
}

interface UserResult {
  id: string;
  email: string;
  name: string;
}

/**
 * GET /api/migrations/fix-org-owners-simple
 * One-time migration to add missing organization owners - GET version for easy testing
 * SUPERUSER ONLY
 */
router.get(
  '/migrations/fix-org-owners-simple',
  authenticateToken,
  requireSuperuser,
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('[fix-org-owners] Starting migration...');

      // Get all organizations
      const orgs = db
        .prepare('SELECT id, name, created_by_id FROM organizations')
        .all() as OrgResult[];

      console.log(`[fix-org-owners] Found ${orgs.length} organizations`);

      const missingOwners: Array<{ org: OrgResult; user: UserResult }> = [];

      // Check each organization
      for (const org of orgs) {
        const membership = db
          .prepare('SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?')
          .get(org.id, org.created_by_id);

        if (!membership) {
          const user = db
            .prepare('SELECT id, email, name FROM users WHERE id = ?')
            .get(org.created_by_id) as UserResult | undefined;

          if (user) {
            console.log(`[fix-org-owners] Missing: ${user.email} for org "${org.name}"`);
            missingOwners.push({ org, user });
          }
        }
      }

      if (missingOwners.length === 0) {
        console.log('[fix-org-owners] No missing owners found');
        res.json({
          success: true,
          message: 'All organizations already have their creators registered as members',
          fixed: 0,
        });
        return;
      }

      console.log(`[fix-org-owners] Fixing ${missingOwners.length} organizations...`);

      // Fix each missing owner
      const insertStmt = db.prepare(`
        INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at)
        VALUES (?, ?, ?, 'owner', ?, datetime('now'))
      `);

      const fixed: string[] = [];
      const errors: Array<{ org: string; error: string }> = [];

      for (const { org, user } of missingOwners) {
        const id = randomUUID();
        try {
          insertStmt.run(id, org.id, user.id, user.id);
          console.log(`[fix-org-owners] ✅ Fixed: ${user.email} → "${org.name}"`);
          fixed.push(`${user.email} → "${org.name}"`);
        } catch (error) {
          console.error(`[fix-org-owners] ❌ Error for "${org.name}":`, error);
          errors.push({
            org: org.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log(
        `[fix-org-owners] Migration complete. Fixed: ${fixed.length}, Errors: ${errors.length}`
      );

      res.json({
        success: true,
        message: `Fixed ${fixed.length} organization(s)`,
        fixed,
        errors: errors.length > 0 ? errors : undefined,
        total_orgs: orgs.length,
        missing_before: missingOwners.length,
      });
    } catch (err) {
      console.error('[fix-org-owners] Fatal error:', err);
      next(err);
    }
  }
);

export default router;
