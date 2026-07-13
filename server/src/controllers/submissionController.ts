import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const createSubmission = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ error: '只有学生可以提交作业' });
    }

    const { homeworkId, content, imageUrl, fileUrl, fileName } = req.body;

    let files: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      files = req.files.map((file) => ({
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        type: file.mimetype,
        size: file.size
      }));
    }

    const submission = await prisma.submission.create({
      data: {
        homeworkId,
        studentId: req.user.id,
        content,
        imageUrl,
        fileUrl,
        fileName,
        files: files.length > 0 ? JSON.stringify(files) : null,
        status: 'submitted',
      },
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('提交作业错误:', error);
    res.status(500).json({ error: '提交作业失败' });
  }
};

export const getSubmissions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    let submissions;
    if (req.user.role === 'teacher') {
      const { homeworkId } = req.query;
      if (homeworkId) {
        submissions = await prisma.submission.findMany({
          where: { homeworkId: homeworkId as string },
          include: {
            student: { select: { id: true, name: true, email: true } },
            homework: true,
          },
          orderBy: { submittedAt: 'desc' },
        });
      } else {
        submissions = await prisma.submission.findMany({
          include: {
            student: { select: { id: true, name: true, email: true } },
            homework: true,
          },
          orderBy: { submittedAt: 'desc' },
        });
      }
    } else {
      submissions = await prisma.submission.findMany({
        where: { studentId: req.user.id },
        include: { homework: true },
        orderBy: { submittedAt: 'desc' },
      });
    }

    submissions = submissions.map((sub: any) => ({
      ...sub,
      files: sub.files ? JSON.parse(sub.files) : null
    }));

    res.json(submissions);
  } catch (error) {
    console.error('获取提交错误:', error);
    res.status(500).json({ error: '获取提交失败' });
  }
};

export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教师可以批改作业' });
    }

    const { id } = req.params;
    const { grade, feedback, homeworkCompletion, accuracy, participation, creativity, teamwork, improvement } = req.body;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!submission) {
      return res.status(404).json({ error: '提交不存在' });
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        grade,
        feedback,
        homeworkCompletion,
        accuracy,
        participation,
        creativity,
        teamwork,
        improvement,
        gradedAt: new Date(),
        status: 'graded',
      },
    });

    let studentStats = await prisma.studentStats.findUnique({
      where: { studentId: submission.studentId }
    });

    if (!studentStats) {
      studentStats = await prisma.studentStats.create({
        data: {
          studentId: submission.studentId,
          homeworkCompletion: homeworkCompletion || 0,
          accuracy: accuracy || 0,
          participation: participation || 0,
          creativity: creativity || 0,
          teamwork: teamwork || 0,
          improvement: improvement || 0,
          level: 1
        }
      });
    } else {
      const allSubmissions = await prisma.submission.findMany({
        where: { studentId: submission.studentId, status: 'graded' },
        select: {
          homeworkCompletion: true,
          accuracy: true,
          participation: true,
          creativity: true,
          teamwork: true,
          improvement: true
        }
      });

      const newSubmissions = [...allSubmissions, updatedSubmission];

      const avg = (arr: (number | null | undefined)[]) => {
        const valid = arr.filter(x => x != null) as number[];
        return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
      };

      studentStats = await prisma.studentStats.update({
        where: { studentId: submission.studentId },
        data: {
          homeworkCompletion: avg(newSubmissions.map(s => s.homeworkCompletion)),
          accuracy: avg(newSubmissions.map(s => s.accuracy)),
          participation: avg(newSubmissions.map(s => s.participation)),
          creativity: avg(newSubmissions.map(s => s.creativity)),
          teamwork: avg(newSubmissions.map(s => s.teamwork)),
          improvement: avg(newSubmissions.map(s => s.improvement))
        }
      });
    }

    res.json(updatedSubmission);
  } catch (error) {
    console.error('批改作业错误:', error);
    res.status(500).json({ error: '批改作业失败' });
  }
};
