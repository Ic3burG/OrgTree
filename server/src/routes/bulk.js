import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  bulkDeletePeople,
  bulkMovePeople,
  bulkEditPeople,
  bulkDeleteDepartments,
  bulkEditDepartments
} from '../services/bulk.service.js';

const router = express.Router();

router.use(authenticateToken);

// ==================== PEOPLE BULK OPERATIONS ====================

// POST /api/organizations/:orgId/people/bulk-delete
// Delete multiple people
router.post('/organizations/:orgId/people/bulk-delete', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { personIds } = req.body;

    if (!personIds) {
      return res.status(400).json({ message: 'personIds array is required' });
    }

    const result = bulkDeletePeople(orgId, personIds, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/organizations/:orgId/people/bulk-move
// Move multiple people to a different department
router.post('/organizations/:orgId/people/bulk-move', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { personIds, targetDepartmentId } = req.body;

    if (!personIds) {
      return res.status(400).json({ message: 'personIds array is required' });
    }

    if (!targetDepartmentId) {
      return res.status(400).json({ message: 'targetDepartmentId is required' });
    }

    const result = bulkMovePeople(orgId, personIds, targetDepartmentId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:orgId/people/bulk-edit
// Edit fields on multiple people
router.put('/organizations/:orgId/people/bulk-edit', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { personIds, updates } = req.body;

    if (!personIds) {
      return res.status(400).json({ message: 'personIds array is required' });
    }

    if (!updates) {
      return res.status(400).json({ message: 'updates object is required' });
    }

    const result = bulkEditPeople(orgId, personIds, updates, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==================== DEPARTMENT BULK OPERATIONS ====================

// POST /api/organizations/:orgId/departments/bulk-delete
// Delete multiple departments
router.post('/organizations/:orgId/departments/bulk-delete', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { departmentIds } = req.body;

    if (!departmentIds) {
      return res.status(400).json({ message: 'departmentIds array is required' });
    }

    const result = bulkDeleteDepartments(orgId, departmentIds, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/organizations/:orgId/departments/bulk-edit
// Edit fields on multiple departments (mainly re-parenting)
router.put('/organizations/:orgId/departments/bulk-edit', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { departmentIds, updates } = req.body;

    if (!departmentIds) {
      return res.status(400).json({ message: 'departmentIds array is required' });
    }

    if (!updates) {
      return res.status(400).json({ message: 'updates object is required' });
    }

    const result = bulkEditDepartments(orgId, departmentIds, updates, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
