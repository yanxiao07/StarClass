import { apiClient } from './client';

interface ClassData {
  id: string;
  name: string;
  classCode: string;
  teacherId: string;
  isAllMuted: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
  };
}

export const classApi = {
  async createClass(name: string): Promise<ClassData> {
    return apiClient.post<ClassData>('/api/class/create', { name });
  },

  async joinClass(classCode: string): Promise<any> {
    return apiClient.post('/api/class/join', { classCode });
  },

  async getTeacherClasses(): Promise<ClassData[]> {
    return apiClient.get<ClassData[]>('/api/class/teacher');
  },

  async getClassById(classId: string): Promise<ClassData> {
    return apiClient.get<ClassData>(`/api/class/${classId}`);
  },

  async removeStudent(classId: string, studentId: string): Promise<any> {
    return apiClient.delete(`/api/class/${classId}/students/${studentId}`);
  },
};
