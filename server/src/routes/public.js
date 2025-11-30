import express from 'express';
import db from '../db.js';

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
      SELECT p.id, p.department_id, p.name, p.title, p.email, p.phone, p.office, p.sort_order
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
      peopleByDept[person.department_id].push(person);
    });

    // Add people to departments
    const departmentsWithPeople = departments.map(dept => ({
      ...dept,
      people: peopleByDept[dept.id] || []
    }));

    res.json({
      ...org,
      departments: departmentsWithPeople
    });
  } catch (err) {
    next(err);
  }
});

export default router;
