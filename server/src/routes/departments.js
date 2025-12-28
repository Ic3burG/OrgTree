import express from 'express';
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
  emitDepartmentDeleted
} from '../services/socket-events.service.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/organizations/:orgId/departments
router.get('/organizations/:orgId/departments', async (req, res, next) => {
  try {
    const depts = await getDepartments(req.params.orgId, req.user.id);
    res.json(depts);
  } catch (err) {
    next(err);
  }
});

// GET /api/organizations/:orgId/departments/:deptId
router.get('/organizations/:orgId/departments/:deptId', async (req, res, next) => {
  try {
    const dept = await getDepartmentById(req.params.orgId, req.params.deptId, req.user.id);
    res.json(dept);
  } catch (err) {
    next(err);
  }
});

// POST /api/organizations/:orgId/departments
router.post('/organizations/:orgId/departments', async (req, res, next) => {
  try {
    console.log('=== POST /departments ===');
    console.log('Request body:', req.body);

    const { name, description, parentId } = req.body;

    console.log('Extracted - name:', name, 'description:', description, 'parentId:', parentId);

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const dept = await createDepartment(
      req.params.orgId,
      {
        name: name.trim(),
        description: description || null,
        parentId: parentId || null
      },
      req.user.id
    );

    // Emit real-time event
    emitDepartmentCreated(req.params.orgId, dept, req.user);

    console.log('Created department:', dept);
    res.status(201).json(dept);
  } catch (err) {
    console.error('Create department error:', err);
    next(err);
  }
});

// PUT /api/organizations/:orgId/departments/:deptId
router.put('/organizations/:orgId/departments/:deptId', async (req, res, next) => {
  try {
    console.log('=== PUT /departments/:deptId ===');
    console.log('Department ID:', req.params.deptId);
    console.log('Request body:', req.body);

    const { name, description, parentId } = req.body;

    console.log('Extracted - name:', name, 'description:', description, 'parentId:', parentId);

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Department name cannot be empty' });
    }

    const dept = await updateDepartment(
      req.params.orgId,
      req.params.deptId,
      {
        name: name?.trim(),
        description,
        parentId
      },
      req.user.id
    );

    // Emit real-time event
    emitDepartmentUpdated(req.params.orgId, dept, req.user);

    console.log('Updated department:', dept);
    res.json(dept);
  } catch (err) {
    console.error('Update department error:', err);
    next(err);
  }
});

// DELETE /api/organizations/:orgId/departments/:deptId
router.delete('/organizations/:orgId/departments/:deptId', async (req, res, next) => {
  try {
    // Get full department data before deleting for audit trail
    const department = db.prepare(`
      SELECT id, name, description, parent_id as parentId, organization_id
      FROM departments
      WHERE id = ? AND organization_id = ?
    `).get(req.params.deptId, req.params.orgId);

    await deleteDepartment(req.params.orgId, req.params.deptId, req.user.id);

    // Emit real-time event with full department data
    if (department) {
      emitDepartmentDeleted(req.params.orgId, department, req.user);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
