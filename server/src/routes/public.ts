import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { getInvitationByToken } from '../services/invitation.service.js';
import { createAuditLog } from '../services/audit.service.js';
import type { CustomFieldDefinition } from '../types/index.js';

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
      WHERE organization_id = ? AND deleted_at IS NULL
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
      WHERE d.organization_id = ? AND p.deleted_at IS NULL AND d.deleted_at IS NULL
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

      // Get all custom field values for this organization
      let customValues: { entity_id: string; field_key: string; value: string }[] = [];
      try {
        customValues = db.prepare(`
          SELECT cv.entity_id, cd.field_key, cv.value
          FROM custom_field_values cv
          JOIN custom_field_definitions cd ON cv.field_id = cd.id
          WHERE cv.organization_id = ? AND cv.deleted_at IS NULL
        `).all(org.id) as { entity_id: string; field_key: string; value: string }[];
      } catch (err) {
        // Table may not exist in older databases or tests
        console.warn('Failed to fetch custom field values:', err);
      }

      const valuesByEntity: Record<string, Record<string, string>> = {};
      customValues.forEach(v => {
        if (!valuesByEntity[v.entity_id]) valuesByEntity[v.entity_id] = {};
        valuesByEntity[v.entity_id][v.field_key] = v.value;
      });

      // Get custom field definitions
      let fieldDefinitions: CustomFieldDefinition[] = [];
      try {
        fieldDefinitions = db.prepare(`
          SELECT id, organization_id, entity_type, name, field_key, field_type, options, is_required, is_searchable, sort_order
          FROM custom_field_definitions
          WHERE organization_id = ? AND deleted_at IS NULL
          ORDER BY sort_order ASC
        `).all(org.id) as CustomFieldDefinition[];
      } catch (err) {
        // Table may not exist in older databases or tests
        console.warn('Failed to fetch custom field definitions:', err);
      }

      interface PersonOutput {
        id: string;
        departmentId: string;
        name: string;
        title: string | null;
        email: string | null;
        phone: string | null;
        sortOrder: number;
        custom_fields?: Record<string, string>;
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
          custom_fields: valuesByEntity[person.id] || {},
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
        custom_fields: valuesByEntity[dept.id] || {},
      }));

      // Return with camelCase field names
      res.json({
        id: org.id,
        name: org.name,
        createdAt: org.created_at,
        departments: departmentsWithPeople,
        fieldDefinitions: fieldDefinitions.map(fd => ({
           id: fd.id,
           organization_id: fd.organization_id,
           entity_type: fd.entity_type,
           name: fd.name,
           field_key: fd.field_key,
           field_type: fd.field_type,
           options: fd.options ? JSON.parse(fd.options) : undefined,
           is_required: Boolean(fd.is_required),
           is_searchable: Boolean(fd.is_searchable),
           sort_order: fd.sort_order
        })),
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
