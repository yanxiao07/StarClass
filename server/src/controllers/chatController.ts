import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getClassMessages = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { classId } = req.params;
    const messages = await (prisma as any).chatMessage.findMany({
      where: { classId },
      include: {
        sender: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    console.error('获取班级聊天记录错误:', error);
    res.status(500).json({ error: '获取聊天记录失败' });
  }
};

export const sendClassMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    const { classId } = req.params;
    const { content } = req.body;
    let imageUrl = req.body.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (req.user.role === 'student') {
      if (req.user.isMuted) {
        return res.status(403).json({ error: '您已被禁言，无法发送消息' });
      }

      const targetClass = await (prisma as any).class.findUnique({
        where: { id: classId }
      });

      if (targetClass?.isAllMuted) {
        return res.status(403).json({ error: '班级已全体禁言，无法发送消息' });
      }
    }

    const message = await (prisma as any).chatMessage.create({
      data: {
        classId,
        senderId: req.user.id,
        content: content || null,
        imageUrl: imageUrl || null
      },
      include: {
        sender: true
      }
    });
    res.json(message);
  } catch (error) {
    console.error('发送班级消息错误:', error);
    res.status(500).json({ error: '发送消息失败' });
  }
};

export const muteStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以禁言学生' });
    }
    const { studentId } = req.params;
    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { isMuted: true } as any
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('禁言学生错误:', error);
    res.status(500).json({ error: '禁言失败' });
  }
};

export const unmuteStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以解除禁言' });
    }
    const { studentId } = req.params;
    const updatedUser = await prisma.user.update({
      where: { id: studentId },
      data: { isMuted: false } as any
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('解除禁言错误:', error);
    res.status(500).json({ error: '解除禁言失败' });
  }
};

export const muteAllStudents = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以全体禁言' });
    }
    const { classId } = req.params;

    const targetClass = await (prisma as any).class.findUnique({
      where: { id: classId }
    });

    if (!targetClass) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (targetClass.teacherId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此班级' });
    }

    const updatedClass = await (prisma as any).class.update({
      where: { id: classId },
      data: { isAllMuted: true }
    });

    res.json(updatedClass);
  } catch (error) {
    console.error('全体禁言错误:', error);
    res.status(500).json({ error: '全体禁言失败' });
  }
};

export const unmuteAllStudents = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以解除全体禁言' });
    }
    const { classId } = req.params;

    const targetClass = await (prisma as any).class.findUnique({
      where: { id: classId }
    });

    if (!targetClass) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (targetClass.teacherId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此班级' });
    }

    const updatedClass = await (prisma as any).class.update({
      where: { id: classId },
      data: { isAllMuted: false }
    });

    res.json(updatedClass);
  } catch (error) {
    console.error('解除全体禁言错误:', error);
    res.status(500).json({ error: '解除全体禁言失败' });
  }
};

export const uploadChatImage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('上传聊天图片错误:', error);
    res.status(500).json({ error: '上传图片失败' });
  }
};
