import express from 'express';
import { getStoreItems, purchaseItem, getPurchases, useItem } from '../controllers/storeController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/items', getStoreItems);
router.post('/items/:itemId/purchase', authMiddleware, purchaseItem);
router.post('/items/:itemId/use', authMiddleware, useItem);
router.get('/purchases', authMiddleware, getPurchases);

export default router;
