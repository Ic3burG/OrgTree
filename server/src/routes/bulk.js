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

// Security: Maximum items per bulk operation
const MAX_BULK_SIZE = 100;

// Helper to validate array input
function validateBulkArray(arr, fieldName) {
  if (!arr || !Array.isArray(arr)) {
    return { valid: false, message: `${fieldName} array is required` };
  }
  if (arr.length === 0) {
    return { valid: false, message: `${fieldName} array cannot be empty` };
  }
  if (arr.length > MAX_BULK_SIZE) {
    return { valid: false, message: `${fieldName} exceeds maximum limit of ${MAX_BULK_SIZE} items` };
  }
  return { valid: true };
}

// ==================== PEOPLE BULK OPERATIONS ====================

// POST /api/organizations/:orgId/people/bulk-delete
// Delete multiple people
router.post('/organizations/:orgId/people/bulk-delete', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { personIds } = req.body;

    const validation = validateBulkArray(personIds, 'personIds');
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
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

    const validation = validateBulkArray(personIds, 'personIds');
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
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

    const validation = validateBulkArray(personIds, 'personIds');
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'updates object is required' });
    }

    // Security: Whitelist allowed fields to prevent mass assignment
    const allowedPersonFields = ['title', 'departmentId', 'email', 'phone'];
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedPersonFields.includes(key))
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        message: `No valid update fields provided. Allowed: ${allowedPersonFields.join(', ')}`
      });
    }

    const result = bulkEditPeople(orgId, personIds, sanitizedUpdates, req.user);
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

    const validation = validateBulkArray(departmentIds, 'departmentIds');
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
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

    const validation = validateBulkArray(departmentIds, 'departmentIds');
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'updates object is required' });
    }

    // Security: Whitelist allowed fields to prevent mass assignment
    const allowedDeptFields = ['parentId', 'name', 'description'];
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedDeptFields.includes(key))
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        message: `No valid update fields provided. Allowed: ${allowedDeptFields.join(', ')}`
      });
    }

    const result = bulkEditDepartments(orgId, departmentIds, sanitizedUpdates, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
