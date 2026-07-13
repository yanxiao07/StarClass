export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  nickname?: string;
  avatar?: string;
  stars?: number;
  theme?: string;
  chatBubbleStyle?: string;
  lastNicknameChange?: Date;
  lastAvatarChange?: Date;
  isMuted?: boolean;
  mutedUntil?: Date;
  classId?: string;
  className?: string;
  studentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: Date;
  teacherId: string;
  teacherName: string;
  className: string;
  createdAt: Date;
  attachments?: string[];
}

export interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  images: string[];
  files: string[];
  text: string;
  submittedAt: Date;
  status: 'pending' | 'graded';
  grade?: number;
  feedback?: string;
  annotations?: Annotation[];
  rewards?: Reward[];
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  type: 'comment' | 'correction' | 'praise';
  createdAt: Date;
}

export interface Reward {
  id: string;
  type: 'star' | 'medal' | 'badge';
  description: string;
  awardedAt: Date;
}

export interface StudentStats {
  studentId: string;
  studentName: string;
  dimensions: {
    作业完成度: number;
    正确率: number;
    进步速度: number;
    参与度: number;
    书写规范: number;
    创新思维: number;
  };
  totalStars: number;
  totalMedals: number;
  level: number;
  submissionCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
