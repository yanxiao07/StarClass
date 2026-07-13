import { Router } from 'express';
import { createClass, joinClass, getTeacherClasses, getClassById, removeStudent } from '../controllers/classController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/create', authMiddleware, createClass);
router.post('/join', authMiddleware, joinClass);
router.get('/teacher', authMiddleware, getTeacherClasses);
router.get('/:classId', authMiddleware, getClassById);
router.delete('/:classId/students/:studentId', authMiddleware, removeStudent);

export default router;
