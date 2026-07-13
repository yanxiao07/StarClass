import express from 'express';
import { register, login, getCurrentUser, uploadAvatar } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadSingle } from '../utils/upload.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/upload-avatar', authMiddleware, uploadSingle, uploadAvatar);

export default router;
