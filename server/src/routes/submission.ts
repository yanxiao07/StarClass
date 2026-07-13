import express from 'express';
import { createSubmission, getSubmissions, gradeSubmission } from '../controllers/submissionController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadMultiple } from '../utils/upload.js';

const router = express.Router();

router.post('/', authMiddleware, uploadMultiple, createSubmission);
router.get('/', authMiddleware, getSubmissions);
router.put('/:id/grade', authMiddleware, gradeSubmission);

export default router;
