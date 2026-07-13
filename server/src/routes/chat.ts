import express from 'express';
import { getClassMessages, sendClassMessage, muteStudent, unmuteStudent, uploadChatImage, muteAllStudents, unmuteAllStudents } from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadSingle } from '../utils/upload.js';

const router = express.Router();

router.get('/classes/:classId/messages', authMiddleware, getClassMessages);
router.post('/classes/:classId/messages', authMiddleware, uploadSingle, sendClassMessage);
router.post('/upload-chat-image', authMiddleware, uploadSingle, uploadChatImage);
router.post('/students/:studentId/mute', authMiddleware, muteStudent);
router.post('/students/:studentId/unmute', authMiddleware, unmuteStudent);
router.post('/classes/:classId/mute-all', authMiddleware, muteAllStudents);
router.post('/classes/:classId/unmute-all', authMiddleware, unmuteAllStudents);

export default router;
