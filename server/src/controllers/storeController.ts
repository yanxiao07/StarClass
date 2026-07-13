import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

const getRandomStars = (boxType: string): number => {
  const rand = Math.random();
  
  if (boxType === '幸运盲盒') {
    if (rand < 0.1) return 5;
    if (rand < 0.3) return 15;
    if (rand < 0.6) return 30;
    if (rand < 0.85) return 50;
    return 80;
  } else if (boxType === '豪华盲盒') {
    if (rand < 0.05) return 20;
    if (rand < 0.2) return 50;
    if (rand < 0.5) return 100;
    if (rand < 0.8) return 150;
    return 250;
  } else if (boxType === '至尊盲盒') {
    if (rand < 0.03) return 50;
    if (rand < 0.15) return 150;
    if (rand < 0.4) return 300;
    if (rand < 0.75) return 500;
    return 1000;
  }
  
  return 0;
};

export const getStoreItems = async (req: Request, res: Response) => {
  try {
    const items = await (prisma as any).storeItem.findMany();
    res.json(items);
  } catch (error) {
    console.error('获取商城物品错误:', error);
    res.status(500).json({ error: '获取商城物品失败' });
  }
};

export const getPurchases = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: req.user.id },
      include: { item: true }
    });
    res.json(purchases);
  } catch (error) {
    console.error('获取购买记录错误:', error);
    res.status(500).json({ error: '获取购买记录失败' });
  }
};

export const purchaseItem = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    const { itemId } = req.params;
    const item = await (prisma as any).storeItem.findUnique({
      where: { id: itemId }
    });
    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }
    
    if (item.type !== 'blindBox') {
      const existingPurchase = await (prisma as any).purchase.findFirst({
        where: { userId: req.user.id, itemId }
      });
      if (existingPurchase) {
        return res.status(400).json({ error: '已经购买过此物品' });
      }
    }
    
    if ((req.user as any).stars < item.price) {
      return res.status(400).json({ error: '星星不足' });
    }
    
    let starsEarned = 0;
    if (item.type === 'blindBox') {
      starsEarned = getRandomStars(item.name);
    }
    
    const result = await (prisma as any).$transaction(async (tx: any) => {
      let starsChange = -item.price;
      if (item.type === 'blindBox') {
        starsChange += starsEarned;
      }
      
      const updatedUser = await tx.user.update({
        where: { id: req.user.id },
        data: {
          stars: (req.user as any).stars + starsChange,
          ...(item.type === 'theme' && { theme: item.id }),
          ...(item.type === 'chatBubble' && { chatBubbleStyle: item.id })
        }
      });
      
      let purchase = null;
      if (item.type !== 'blindBox') {
        purchase = await tx.purchase.create({
          data: {
            userId: req.user.id,
            itemId
          }
        });
      }
      
      return { purchase, user: updatedUser, starsEarned };
    });
    
    res.json(result);
  } catch (error) {
    console.error('购买物品错误:', error);
    res.status(500).json({ error: '购买失败' });
  }
};

export const useItem = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    const { itemId } = req.params;
    
    const purchase = await (prisma as any).purchase.findFirst({
      where: { userId: req.user.id, itemId },
      include: { item: true }
    });
    
    if (!purchase) {
      return res.status(400).json({ error: '您还没有购买此物品' });
    }

    const updateData: any = {};
    if (purchase.item.type === 'theme') {
      updateData.theme = itemId;
    } else if (purchase.item.type === 'chatBubble') {
      updateData.chatBubbleStyle = itemId;
    } else {
      return res.status(400).json({ error: '不支持的物品类型' });
    }

    const updatedUser = await (prisma as any).user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('使用物品错误:', error);
    res.status(500).json({ error: '使用物品失败' });
  }
};
