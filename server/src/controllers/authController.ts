import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, className, studentId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        className: role === 'student' ? className : null,
        studentId: role === 'student' ? studentId : null,
        stars: 0
      },
    });

    if (role === 'student') {
      await prisma.studentStats.create({
        data: {
          studentId: user.id,
        },
      });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        classId: (user as any).classId,
        className: user.className,
        studentId: user.studentId,
        stars: user.stars
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { studentId: email, role: 'student' },
      });
    }

    if (!user) {
      return res.status(400).json({ error: '邮箱/学号或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: '邮箱/学号或密码错误' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        classId: (user as any).classId,
        className: user.className,
        studentId: user.studentId,
        stars: user.stars,
        avatar: user.avatar
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    res.json({ user: req.user });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const updatedUser = await prisma.user.update({
      where: { id: (req.user as any).id },
      data: { avatar: avatarUrl }
    });

    res.json({ user: updatedUser, avatarUrl });
  } catch (error) {
    console.error('上传头像错误:', error);
    res.status(500).json({ error: '上传头像失败' });
  }
};
