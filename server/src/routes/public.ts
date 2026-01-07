import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { getInvitationByToken } from '../services/invitation.service.js';
import { createAuditLog } from '../services/audit.service.js';

const router = express.Router();

// Rate limiter for public endpoints - prevents brute force and enumeration
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    // Security: Log rate limit violation
    const ipAddress = req.ip || (req.socket?.remoteAddress ?? '');
    createAuditLog(
      null, // System-wide security event
      null, // Public endpoints don't have user info
      'rate_limit_exceeded',
      'security',
      'rate_limiting',
      {
        endpoint: req.path,
        method: req.method,
        ipAddress,
        limit: 100,
        windowMs: 15 * 60 * 1000,
        timestamp: new Date().toISOString(),
      }
    );
    res.status(429).json({ message: 'Too many requests, please try again later' });
  },
});

router.use(publicLimiter);

/**
 * GET /api/public/org/:shareToken
 * Get public organization by share token (no auth required)
 */
router.get(
  '/org/:shareToken',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shareToken } = req.params;

      // Find organization by share token
      const org = db
        .prepare(
          `
      SELECT id, name, created_at
      FROM organizations
      WHERE share_token = ? AND is_public = 1
    `
        )
        .get(shareToken) as { id: string; name: string; created_at: string } | undefined;

      if (!org) {
        res.status(404).json({ message: 'Organization not found or not public' });
        return;
      }

      // Get all departments for this organization
      const departments = db
        .prepare(
          `
      SELECT id, organization_id, parent_id, name, description, sort_order
      FROM departments
      WHERE organization_id = ?
      ORDER BY sort_order ASC
    `
        )
        .all(org.id) as {
        id: string;
        organization_id: string;
        parent_id: string | null;
        name: string;
        description: string | null;
        sort_order: number;
      }[];

      // Get all people for each department
      const people = db
        .prepare(
          `
      SELECT p.id, p.department_id, p.name, p.title, p.email, p.phone, p.sort_order
      FROM people p
      INNER JOIN departments d ON p.department_id = d.id
      WHERE d.organization_id = ?
      ORDER BY p.sort_order ASC
    `
        )
        .all(org.id) as {
        id: string;
        department_id: string;
        name: string;
        title: string | null;
        email: string | null;
        phone: string | null;
        sort_order: number;
      }[];

      interface PersonOutput {
        id: string;
        departmentId: string;
        name: string;
        title: string | null;
        email: string | null;
        phone: string | null;
        sortOrder: number;
      }

      // Group people by department
      const peopleByDept: Record<string, PersonOutput[]> = {};
      people.forEach(person => {
        const deptId = String(person.department_id);
        if (!peopleByDept[deptId]) {
          peopleByDept[deptId] = [];
        }
        // Convert to camelCase for frontend
        peopleByDept[deptId].push({
          id: person.id,
          departmentId: person.department_id,
          name: person.name,
          title: person.title,
          email: person.email,
          phone: person.phone,
          sortOrder: person.sort_order,
        });
      });

      // Add people to departments and convert to camelCase
      const departmentsWithPeople = departments.map(dept => ({
        id: dept.id,
        organizationId: dept.organization_id,
        parentId: dept.parent_id,
        name: dept.name,
        description: dept.description,
        sortOrder: dept.sort_order,
        people: peopleByDept[String(dept.id)] || [],
      }));

      // Return with camelCase field names
      res.json({
        id: org.id,
        name: org.name,
        createdAt: org.created_at,
        departments: departmentsWithPeople,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/public/invitation/:token
 * Get invitation details by token (no auth required)
 */
router.get(
  '/invitation/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const invitation = getInvitationByToken(token!);

      if (!invitation) {
        res.status(404).json({ message: 'Invitation not found' });
        return;
      }

      res.json(invitation);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
