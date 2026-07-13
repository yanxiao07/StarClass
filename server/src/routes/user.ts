import express from 'express';
import { getStudents, getStudentStats, updateStudentStats, updateProfile, rewardStars, getMyStats, deleteAccount } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/students', authMiddleware, getStudents);
router.get('/students/:studentId/stats', authMiddleware, getStudentStats);
router.get('/my-stats', authMiddleware, getMyStats);
router.put('/students/:studentId/stats', authMiddleware, updateStudentStats);
router.put('/profile', authMiddleware, updateProfile);
router.post('/reward-stars', authMiddleware, rewardStars);
router.delete('/delete-account', authMiddleware, deleteAccount);

export default router;
