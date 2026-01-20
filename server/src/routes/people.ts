import express, { Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getPeopleByDepartment,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  movePerson,
} from '../services/people.service.js';
import {
  emitPersonCreated,
  emitPersonUpdated,
  emitPersonDeleted,
} from '../services/socket-events.service.js';
import db from '../db.js';
import type { AuthRequest } from '../types/index.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/departments/:deptId/people
router.get(
  '/departments/:deptId/people',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const people = await getPeopleByDepartment(req.params.deptId!, req.user!.id);
      res.json(people);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/departments/:deptId/people
router.post(
  '/departments/:deptId/people',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, title, email, phone, is_starred, customFields } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ message: 'Person name is required' });
        return;
      }

      const person = await createPerson(
        req.params.deptId!,
        { name: name.trim(), title, email, phone, isStarred: Boolean(is_starred), customFields },
        req.user!.id
      );

      // Get orgId from department for real-time event
      const dept = db
        .prepare('SELECT organization_id FROM departments WHERE id = ?')
        .get(req.params.deptId!) as { organization_id: string } | undefined;
      if (dept) {
        emitPersonCreated(
          dept.organization_id,
          person as unknown as Record<string, unknown>,
          req.user!
        );
      }

      res.status(201).json(person);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/people/:personId
router.get(
  '/people/:personId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const person = await getPersonById(req.params.personId!, req.user!.id);
      res.json(person);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/people/:personId
router.put(
  '/people/:personId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, title, email, phone, departmentId, is_starred, customFields } = req.body;

      if (name !== undefined && !name.trim()) {
        res.status(400).json({ message: 'Person name cannot be empty' });
        return;
      }

      const person = await updatePerson(
        req.params.personId!,
        {
          name: name?.trim(),
          title,
          email,
          phone,
          departmentId,
          isStarred: is_starred,
          customFields,
        },
        req.user!.id
      );

      // Get orgId from person's department for real-time event
      const personWithDept = person as { department_id: string };
      const dept = db
        .prepare('SELECT organization_id FROM departments WHERE id = ?')
        .get(String(personWithDept.department_id)) as { organization_id: string } | undefined;
      if (dept) {
        emitPersonUpdated(
          dept.organization_id,
          person as unknown as Record<string, unknown>,
          req.user!
        );
      }

      res.json(person);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/people/:personId
router.delete(
  '/people/:personId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get full person data before deleting for audit trail
      const person = db
        .prepare(
          `
      SELECT p.id, p.name, p.title, p.email, p.phone, p.department_id as departmentId, d.organization_id, d.name as departmentName
      FROM people p
      JOIN departments d ON p.department_id = d.id
      WHERE p.id = ?
    `
        )
        .get(req.params.personId!) as
        | {
            id: string;
            name: string;
            title: string;
            email: string;
            phone: string;
            departmentId: string;
            organization_id: string;
            departmentName: string;
          }
        | undefined;

      await deletePerson(req.params.personId!, req.user!.id);

      // Emit real-time event with full person data
      if (person) {
        emitPersonDeleted(person.organization_id, person, req.user!);
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/people/:personId/move
router.put(
  '/people/:personId/move',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { departmentId } = req.body;

      if (!departmentId) {
        res.status(400).json({ message: 'Department ID is required' });
        return;
      }

      const person = await movePerson(req.params.personId!, departmentId, req.user!.id);

      // Get orgId from new department for real-time event
      const dept = db
        .prepare('SELECT organization_id FROM departments WHERE id = ?')
        .get(departmentId) as { organization_id: string } | undefined;
      if (dept) {
        emitPersonUpdated(
          dept.organization_id,
          person as unknown as Record<string, unknown>,
          req.user!
        );
      }

      res.json(person);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
