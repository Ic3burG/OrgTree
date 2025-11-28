import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getPeopleByDepartment,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  movePerson,
} from '../services/people.service.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/departments/:deptId/people
router.get('/departments/:deptId/people', async (req, res, next) => {
  try {
    const people = await getPeopleByDepartment(req.params.deptId, req.user.id);
    res.json(people);
  } catch (err) {
    next(err);
  }
});

// POST /api/departments/:deptId/people
router.post('/departments/:deptId/people', async (req, res, next) => {
  try {
    const { name, title, email, phone, office } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Person name is required' });
    }

    const person = await createPerson(
      req.params.deptId,
      { name: name.trim(), title, email, phone, office },
      req.user.id
    );
    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
});

// GET /api/people/:personId
router.get('/people/:personId', async (req, res, next) => {
  try {
    const person = await getPersonById(req.params.personId, req.user.id);
    res.json(person);
  } catch (err) {
    next(err);
  }
});

// PUT /api/people/:personId
router.put('/people/:personId', async (req, res, next) => {
  try {
    const { name, title, email, phone, office, departmentId } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Person name cannot be empty' });
    }

    const person = await updatePerson(
      req.params.personId,
      { name: name?.trim(), title, email, phone, office, departmentId },
      req.user.id
    );
    res.json(person);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/people/:personId
router.delete('/people/:personId', async (req, res, next) => {
  try {
    await deletePerson(req.params.personId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PUT /api/people/:personId/move
router.put('/people/:personId/move', async (req, res, next) => {
  try {
    const { departmentId } = req.body;

    if (!departmentId) {
      return res.status(400).json({ message: 'Department ID is required' });
    }

    const person = await movePerson(req.params.personId, departmentId, req.user.id);
    res.json(person);
  } catch (err) {
    next(err);
  }
});

export default router;
