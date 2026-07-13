import express from 'express';
import { chatWithAI } from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/chat', authMiddleware, chatWithAI);

export default router;
