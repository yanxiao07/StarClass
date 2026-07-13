import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const generateClassCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(401).json({ error: '未授权' });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: '班级名称不能为空' });
    }

    let classCode = generateClassCode();
    let existingClass = await (prisma as any).class.findUnique({
      where: { classCode }
    });

    while (existingClass) {
      classCode = generateClassCode();
      existingClass = await (prisma as any).class.findUnique({
        where: { classCode }
      });
    }

    const newClass = await (prisma as any).class.create({
      data: {
        name,
        classCode,
        teacherId: req.user.id
      }
    });

    res.status(201).json(newClass);
  } catch (error) {
    console.error('创建班级错误:', error);
    res.status(500).json({ error: '创建班级失败' });
  }
};

export const joinClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(401).json({ error: '未授权' });
    }

    const { classCode } = req.body;

    if (!classCode) {
      return res.status(400).json({ error: '班级号不能为空' });
    }

    const targetClass = await (prisma as any).class.findUnique({
      where: { classCode }
    });

    if (!targetClass) {
      return res.status(404).json({ error: '班级不存在' });
    }

    const updatedUser = await (prisma as any).user.update({
      where: { id: req.user.id },
      data: {
        classId: targetClass.id,
        className: targetClass.name
      },
      include: { class: true }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('加入班级错误:', error);
    res.status(500).json({ error: '加入班级失败' });
  }
};

export const getTeacherClasses = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(401).json({ error: '未授权' });
    }

    const classes = await (prisma as any).class.findMany({
      where: { teacherId: req.user.id },
      include: {
        students: {
          include: {
            studentStats: true,
            _count: {
              select: { submissions: true }
            }
          }
        },
        _count: {
          select: { students: true }
        }
      }
    });

    res.json(classes);
  } catch (error) {
    console.error('获取班级列表错误:', error);
    res.status(500).json({ error: '获取班级列表失败' });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权' });
    }

    const { classId } = req.params;

    const targetClass = await (prisma as any).class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: { id: true, name: true, email: true }
        },
        students: {
          select: { id: true, name: true, email: true, studentId: true }
        },
        _count: {
          select: { students: true, homeworks: true }
        }
      }
    });

    if (!targetClass) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (req.user.role === 'teacher' && targetClass.teacherId !== req.user.id) {
      return res.status(403).json({ error: '无权访问此班级' });
    }

    if (req.user.role === 'student' && req.user.classId !== targetClass.id) {
      return res.status(403).json({ error: '无权访问此班级' });
    }

    res.json(targetClass);
  } catch (error) {
    console.error('获取班级详情错误:', error);
    res.status(500).json({ error: '获取班级详情失败' });
  }
};

export const removeStudent = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以移除学生' });
    }

    const { classId, studentId } = req.params;

    const targetClass = await (prisma as any).class.findUnique({
      where: { id: classId }
    });

    if (!targetClass) {
      return res.status(404).json({ error: '班级不存在' });
    }

    if (targetClass.teacherId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此班级' });
    }

    const student = await (prisma as any).user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: '学生不存在' });
    }

    if (student.classId !== classId) {
      return res.status(400).json({ error: '该学生不在此班级中' });
    }

    await (prisma as any).user.update({
      where: { id: studentId },
      data: {
        classId: null,
        className: null
      }
    });

    res.json({ message: '学生已从班级移除' });
  } catch (error) {
    console.error('移除学生错误:', error);
    res.status(500).json({ error: '移除学生失败' });
  }
};
