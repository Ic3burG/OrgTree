import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  reorderFieldDefinitions,
} from '../services/custom-fields.service.js';
import {
  emitCustomFieldCreated,
  emitCustomFieldUpdated,
  emitCustomFieldDeleted,
  emitCustomFieldsReordered,
} from '../services/socket-events.service.js';
import db from '../db.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/organizations/:orgId/custom-fields
router.get(
  '/organizations/:orgId/custom-fields',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType } = req.query;
      const type =
        entityType === 'person' || entityType === 'department'
          ? (entityType as 'person' | 'department')
          : 'all';

      const fields = await getFieldDefinitions(req.params.orgId!, type, req.user!.id);
      res.json(fields);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/organizations/:orgId/custom-fields
router.post(
  '/organizations/:orgId/custom-fields',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entity_type, name, field_type, options, is_required, is_searchable } = req.body;

      if (!entity_type || !name || !field_type) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      const field = await createFieldDefinition(
        req.params.orgId!,
        {
          entity_type,
          name,
          field_type,
          options,
          is_required,
          is_searchable,
        },
        req.user!.id
      );

      emitCustomFieldCreated(
        req.params.orgId!,
        field as unknown as Record<string, unknown>,
        req.user!
      );

      res.status(201).json(field);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:orgId/custom-fields/reorder
router.put(
  '/organizations/:orgId/custom-fields/reorder',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entity_type, orderedIds } = req.body;

      if (!entity_type || !orderedIds || !Array.isArray(orderedIds)) {
        res.status(400).json({ message: 'Invalid reorder data' });
        return;
      }

      await reorderFieldDefinitions(req.params.orgId!, entity_type, orderedIds, req.user!.id);

      emitCustomFieldsReordered(req.params.orgId!, { entity_type, orderedIds }, req.user!);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/organizations/:orgId/custom-fields/:fieldId
router.put(
  '/organizations/:orgId/custom-fields/:fieldId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, options, is_required, is_searchable } = req.body;

      const field = await updateFieldDefinition(
        req.params.fieldId!,
        {
          name,
          options,
          is_required,
          is_searchable,
        },
        req.user!.id
      );

      emitCustomFieldUpdated(
        field.organization_id,
        field as unknown as Record<string, unknown>,
        req.user!
      );

      res.json(field);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/organizations/:orgId/custom-fields/:fieldId
router.delete(
  '/organizations/:orgId/custom-fields/:fieldId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get field info before deletion for organization_id
      const field = db
        .prepare(
          'SELECT organization_id, entity_type, name FROM custom_field_definitions WHERE id = ?'
        )
        .get(req.params.fieldId!) as { organization_id: string; entity_type: string; name: string };

      await deleteFieldDefinition(req.params.fieldId!, req.user!.id);

      if (field) {
        emitCustomFieldDeleted(
          field.organization_id,
          { id: req.params.fieldId!, ...field },
          req.user!
        );
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
