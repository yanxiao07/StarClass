import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { friendId } = req.params;

    if (req.user.id === friendId) {
      return res.status(400).json({ error: '不能加自己为好友' });
    }

    const friendRequest = await (prisma as any).friend.create({
      data: {
        user1Id: req.user.id,
        user2Id: friendId,
        status: 'pending'
      }
    });

    res.json(friendRequest);
  } catch (error) {
    console.error('发送好友请求错误:', error);
    res.status(500).json({ error: '发送请求失败' });
  }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { requestId } = req.params;
    const updatedFriend = await (prisma as any).friend.update({
      where: { id: requestId },
      data: { status: 'accepted' }
    });

    res.json(updatedFriend);
  } catch (error) {
    console.error('接受好友请求错误:', error);
    res.status(500).json({ error: '接受请求失败' });
  }
};

export const getFriends = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const friends = await (prisma as any).friend.findMany({
      where: {
        OR: [
          { user1Id: req.user.id, status: 'accepted' },
          { user2Id: req.user.id, status: 'accepted' }
        ]
      }
    });

    res.json(friends);
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ error: '获取好友列表失败' });
  }
};

export const getPrivateMessages = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { friendId } = req.params;
    const messages = await (prisma as any).privateMessage.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('获取私信记录错误:', error);
    res.status(500).json({ error: '获取私信失败' });
  }
};

export const sendPrivateMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { friendId } = req.params;
    const { content, imageUrl } = req.body;

    const message = await (prisma as any).privateMessage.create({
      data: {
        senderId: req.user.id,
        receiverId: friendId,
        content: content || null,
        imageUrl: imageUrl || null
      }
    });

    res.json(message);
  } catch (error) {
    console.error('发送私信错误:', error);
    res.status(500).json({ error: '发送私信失败' });
  }
};
