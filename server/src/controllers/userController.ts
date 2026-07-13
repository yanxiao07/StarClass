import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getStudents = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以查看学生列表' });
    }

    const students = await prisma.user.findMany({
      where: { role: 'student' },
      orderBy: { createdAt: 'desc' }
    });

    res.json(students);
  } catch (error) {
    console.error('获取学生列表错误:', error);
    res.status(500).json({ error: '获取学生列表失败' });
  }
};

export const getMyStats = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ error: '只有学生可以查看自己的统计' });
    }

    let stats = await prisma.studentStats.findUnique({
      where: { studentId: req.user.id }
    });

    if (!stats) {
      stats = await prisma.studentStats.create({
        data: {
          studentId: req.user.id,
          level: 1
        }
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('获取我的统计错误:', error);
    res.status(500).json({ error: '获取我的统计失败' });
  }
};

export const getStudentStats = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以查看学生统计' });
    }

    const { studentId } = req.params;

    const stats = await prisma.studentStats.findUnique({
      where: { studentId }
    });

    res.json(stats);
  } catch (error) {
    console.error('获取学生统计错误:', error);
    res.status(500).json({ error: '获取学生统计失败' });
  }
};

export const updateStudentStats = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以更新学生统计' });
    }

    const { studentId } = req.params;
    const data = req.body;

    const stats = await prisma.studentStats.upsert({
      where: { studentId },
      update: data,
      create: {
        studentId,
        ...data
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('更新学生统计错误:', error);
    res.status(500).json({ error: '更新学生统计失败' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { nickname, avatar, stars } = req.body;
    const updateData: any = {};

    if (nickname) {
      updateData.nickname = nickname;
      updateData.lastNicknameChange = new Date();
    }

    if (avatar) {
      updateData.avatar = avatar;
      updateData.lastAvatarChange = new Date();
    }

    if (stars !== undefined && typeof stars === 'number') {
      updateData.stars = stars;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('更新资料错误:', error);
    res.status(500).json({ error: '更新资料失败' });
  }
};

export const rewardStars = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以给学生加星' });
    }

    const { studentId, stars } = req.body;

    if (!studentId || !stars) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const student = await prisma.user.update({
      where: { id: studentId },
      data: {
        stars: {
          increment: stars
        }
      }
    });

    await prisma.reward.create({
      data: {
        studentId,
        type: 'stars',
        count: stars
      }
    });

    res.json(student);
  } catch (error) {
    console.error('给学生加星错误:', error);
    res.status(500).json({ error: '给学生加星失败' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'teacher') {
      const teacherClasses = await prisma.class.findMany({
        where: { teacherId: userId },
        select: { id: true }
      });

      const classIds = teacherClasses.map(c => c.id);

      await prisma.user.updateMany({
        where: { classId: { in: classIds } },
        data: {
          classId: null,
          className: null
        }
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: '账户已成功注销' });
  } catch (error) {
    console.error('注销账户错误:', error);
    res.status(500).json({ error: '注销账户失败' });
  }
};