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
 * POST /api/migrations/fix-org-owners
 * One-time migration to add missing organization owners to organization_members table
 * SUPERUSER ONLY
 */
router.post(
  '/migrations/fix-org-owners',
  authenticateToken,
  requireSuperuser,
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get all organizations
      const orgs = db
        .prepare('SELECT id, name, created_by_id FROM organizations')
        .all() as OrgResult[];

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
            missingOwners.push({ org, user });
          }
        }
      }

      if (missingOwners.length === 0) {
        res.json({
          success: true,
          message: 'All organizations already have their creators registered as members',
          fixed: 0,
        });
        return;
      }

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
          fixed.push(`${user.email} → "${org.name}"`);
        } catch (error) {
          errors.push({
            org: org.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      res.json({
        success: true,
        message: `Fixed ${fixed.length} organization(s)`,
        fixed,
        errors: errors.length > 0 ? errors : undefined,
        total_orgs: orgs.length,
        missing_before: missingOwners.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
