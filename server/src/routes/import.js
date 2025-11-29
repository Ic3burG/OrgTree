import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../db.js';

const router = express.Router();

router.use(authenticateToken);

// POST /api/organizations/:orgId/import
router.post('/organizations/:orgId/import', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { data } = req.body; // Array of parsed CSV rows

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Verify org ownership
    const org = db
      .prepare('SELECT * FROM organizations WHERE id = ? AND created_by_id = ?')
      .get(orgId, req.user.id);

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Process import within a transaction
    const pathToDeptId = new Map();
    let departmentsCreated = 0;
    let peopleCreated = 0;

    // Sort rows so departments come before their children
    const sortedData = [...data].sort((a, b) => {
      const depthA = (a.path.match(/\//g) || []).length;
      const depthB = (b.path.match(/\//g) || []).length;
      return depthA - depthB;
    });

    // Prepare statements
    const insertDept = db.prepare(`
      INSERT INTO departments (id, organization_id, parent_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertPerson = db.prepare(`
      INSERT INTO people (id, department_id, name, title, email, phone, office, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    // Helper to generate ID
    const generateId = () => {
      return Math.random().toString(36).substring(2, 15) +
             Math.random().toString(36).substring(2, 15);
    };

    try {
      // Start transaction
      db.prepare('BEGIN TRANSACTION').run();

      for (const row of sortedData) {
        const type = row.type.toLowerCase();

        if (type === 'department') {
          // Find parent path
          const pathParts = row.path.split('/').filter(Boolean);
          const parentPath =
            pathParts.length > 1
              ? '/' + pathParts.slice(0, -1).join('/')
              : null;

          const deptId = generateId();
          const parentId = parentPath ? pathToDeptId.get(parentPath) || null : null;

          insertDept.run(
            deptId,
            orgId,
            parentId,
            row.name,
            row.description || null
          );

          pathToDeptId.set(row.path, deptId);
          departmentsCreated++;
        } else if (type === 'person') {
          // Find department from path
          const pathParts = row.path.split('/').filter(Boolean);
          const deptPath = '/' + pathParts.slice(0, -1).join('/');
          const deptId = pathToDeptId.get(deptPath);

          if (deptId) {
            const personId = generateId();
            insertPerson.run(
              personId,
              deptId,
              row.name,
              row.title || null,
              row.email || null,
              row.phone || null,
              row.office || null
            );
            peopleCreated++;
          }
        }
      }

      // Commit transaction
      db.prepare('COMMIT').run();

      res.json({
        success: true,
        departmentsCreated,
        peopleCreated,
      });
    } catch (err) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
