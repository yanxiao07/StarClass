import express from 'express';
import { sendFriendRequest, acceptFriendRequest, getFriends, getPrivateMessages, sendPrivateMessage } from '../controllers/friendController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/friends/:friendId/request', authMiddleware, sendFriendRequest);
router.post('/friends/:requestId/accept', authMiddleware, acceptFriendRequest);
router.get('/friends', authMiddleware, getFriends);
router.get('/messages/:friendId', authMiddleware, getPrivateMessages);
router.post('/messages/:friendId', authMiddleware, sendPrivateMessage);

export default router;
