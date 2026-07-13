import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const createHomework = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以创建作业' });
    }

    const { title, description, dueDate, subject, className } = req.body;

    const homework = await prisma.homework.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        teacherId: req.user.id,
        subject: subject || '其他',
        className: className || '默认班级',
      },
    });

    res.status(201).json(homework);
  } catch (error) {
    console.error('创建作业错误:', error);
    res.status(500).json({ error: '创建作业失败' });
  }
};

export const getHomeworks = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    let homeworks;
    if (req.user.role === 'teacher') {
      homeworks = await prisma.homework.findMany({
        where: { teacherId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });
    } else {
      if (!req.user.classId) {
        res.json([]);
        return;
      }

      homeworks = await prisma.homework.findMany({
        where: { className: req.user.className || '默认班级' },
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { id: true, name: true } },
          submissions: {
            where: {
              studentId: req.user.id
            }
          }
        },
      });
      
      homeworks = homeworks.map((homework: any) => ({
        id: homework.id,
        title: homework.title,
        description: homework.description,
        dueDate: homework.dueDate,
        subject: homework.subject,
        className: homework.className,
        teacherName: homework.teacher?.name || '老师',
        submissions: homework.submissions
      }));
    }

    res.json(homeworks);
  } catch (error) {
    console.error('获取作业错误:', error);
    res.status(500).json({ error: '获取作业失败' });
  }
};

export const getHomework = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const homework = await prisma.homework.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        submissions: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!homework) {
      return res.status(404).json({ error: '作业不存在' });
    }

    res.json(homework);
  } catch (error) {
    console.error('获取作业详情错误:', error);
    res.status(500).json({ error: '获取作业详情失败' });
  }
};

export const updateHomework = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以更新作业' });
    }

    const { id } = req.params;
    const { title, description, dueDate, subject, className } = req.body;

    const existingHomework = await prisma.homework.findUnique({
      where: { id },
    });

    if (!existingHomework) {
      return res.status(404).json({ error: '作业不存在' });
    }

    if (existingHomework.teacherId !== req.user.id) {
      return res.status(403).json({ error: '只能更新自己创建的作业' });
    }

    const homework = await prisma.homework.update({
      where: { id },
      data: {
        title: title || existingHomework.title,
        description: description !== undefined ? description : existingHomework.description,
        dueDate: dueDate ? new Date(dueDate) : existingHomework.dueDate,
        subject: subject || existingHomework.subject,
        className: className || existingHomework.className,
      },
    });

    res.json(homework);
  } catch (error) {
    console.error('更新作业错误:', error);
    res.status(500).json({ error: '更新作业失败' });
  }
};

export const deleteHomework = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以删除作业' });
    }

    const { id } = req.params;

    const existingHomework = await prisma.homework.findUnique({
      where: { id },
    });

    if (!existingHomework) {
      return res.status(404).json({ error: '作业不存在' });
    }

    if (existingHomework.teacherId !== req.user.id) {
      return res.status(403).json({ error: '只能删除自己创建的作业' });
    }

    await prisma.homework.delete({
      where: { id },
    });

    res.json({ message: '作业删除成功' });
  } catch (error) {
    console.error('删除作业错误:', error);
    res.status(500).json({ error: '删除作业失败' });
  }
};

export const getPendingHomeworksCount = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ error: '只有学生可以查看' });
    }

    if (!req.user.classId) {
      res.json({ pendingCount: 0 });
      return;
    }

    const allHomeworks = await prisma.homework.findMany({
      where: { className: req.user.className || '默认班级' },
      include: {
        submissions: {
          where: {
            studentId: req.user.id
          }
        }
      }
    });

    const pendingCount = allHomeworks.filter(hw => hw.submissions.length === 0).length;

    res.json({ pendingCount });
  } catch (error) {
    console.error('获取待完成作业数量错误:', error);
    res.status(500).json({ error: '获取待完成作业数量失败' });
  }
};
