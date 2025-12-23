import express from 'express';
import db from '../db.js';
import { getInvitationByToken } from '../services/invitation.service.js';

const router = express.Router();

/**
 * GET /api/public/org/:shareToken
 * Get public organization by share token (no auth required)
 */
router.get('/org/:shareToken', async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    // Find organization by share token
    const org = db.prepare(`
      SELECT id, name, created_at
      FROM organizations
      WHERE share_token = ? AND is_public = 1
    `).get(shareToken);

    if (!org) {
      return res.status(404).json({ message: 'Organization not found or not public' });
    }

    // Get all departments for this organization
    const departments = db.prepare(`
      SELECT id, organization_id, parent_id, name, description, sort_order
      FROM departments
      WHERE organization_id = ?
      ORDER BY sort_order ASC
    `).all(org.id);

    // Get all people for each department
    const people = db.prepare(`
      SELECT p.id, p.department_id, p.name, p.title, p.email, p.phone, p.sort_order
      FROM people p
      INNER JOIN departments d ON p.department_id = d.id
      WHERE d.organization_id = ?
      ORDER BY p.sort_order ASC
    `).all(org.id);

    // Group people by department
    const peopleByDept = {};
    people.forEach(person => {
      if (!peopleByDept[person.department_id]) {
        peopleByDept[person.department_id] = [];
      }
      // Convert to camelCase for frontend
      peopleByDept[person.department_id].push({
        id: person.id,
        departmentId: person.department_id,
        name: person.name,
        title: person.title,
        email: person.email,
        phone: person.phone,
        sortOrder: person.sort_order
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
      people: peopleByDept[dept.id] || []
    }));

    // Return with camelCase field names
    res.json({
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      departments: departmentsWithPeople
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/invitation/:token
 * Get invitation details by token (no auth required)
 */
router.get('/invitation/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const invitation = getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    res.json(invitation);
  } catch (err) {
    next(err);
  }
});

export default router;
