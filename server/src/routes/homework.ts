import express from 'express';
import { createHomework, getHomeworks, getHomework, updateHomework, deleteHomework, getPendingHomeworksCount } from '../controllers/homeworkController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, createHomework);
router.get('/', authMiddleware, getHomeworks);
router.get('/pending-count', authMiddleware, getPendingHomeworksCount);
router.get('/:id', authMiddleware, getHomework);
router.put('/:id', authMiddleware, updateHomework);
router.delete('/:id', authMiddleware, deleteHomework);

export default router;
