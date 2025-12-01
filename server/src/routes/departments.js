import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  moveDepartment,
} from '../services/department.service.js';

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
    console.log('=== POST /departments route ===');
    console.log('req.body:', req.body);
    const { name, description, parentId } = req.body;
    console.log('Extracted fields:', { name, description, parentId });
    console.log('parentId value:', parentId);
    console.log('parentId type:', typeof parentId);

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const dept = await createDepartment(
      req.params.orgId,
      { name: name.trim(), description, parentId },
      req.user.id
    );
    console.log('Created department:', dept);
    res.status(201).json(dept);
  } catch (err) {
    console.error('Route error:', err);
    next(err);
  }
});

// PUT /api/organizations/:orgId/departments/:deptId
router.put('/organizations/:orgId/departments/:deptId', async (req, res, next) => {
  try {
    console.log('=== PUT /departments route ===');
    console.log('req.body:', req.body);
    const { name, description, parentId } = req.body;
    console.log('Extracted fields:', { name, description, parentId });
    console.log('parentId value:', parentId);
    console.log('parentId type:', typeof parentId);

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Department name cannot be empty' });
    }

    const dept = await updateDepartment(
      req.params.orgId,
      req.params.deptId,
      { name: name?.trim(), description, parentId },
      req.user.id
    );
    console.log('Updated department:', dept);
    res.json(dept);
  } catch (err) {
    console.error('Route error:', err);
    next(err);
  }
});

// DELETE /api/organizations/:orgId/departments/:deptId
router.delete('/organizations/:orgId/departments/:deptId', async (req, res, next) => {
  try {
    await deleteDepartment(req.params.orgId, req.params.deptId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:orgId/departments/:deptId/move
router.put('/organizations/:orgId/departments/:deptId/move', async (req, res, next) => {
  try {
    const { parentId } = req.body;
    const dept = await moveDepartment(req.params.orgId, req.params.deptId, parentId, req.user.id);
    res.json(dept);
  } catch (err) {
    next(err);
  }
});

export default router;
