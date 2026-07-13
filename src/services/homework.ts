import { apiClient } from './client';

export interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  subject: string;
  className: string;
  teacherName: string;
  submissions?: any[];
}

export interface CreateHomeworkData {
  title: string;
  description: string;
  dueDate: string;
  subject?: string;
  className?: string;
}

export const homeworkApi = {
  async createHomework(data: CreateHomeworkData) {
    return apiClient.post<Homework>('/api/homework', data);
  },

  async getHomeworks() {
    return apiClient.get<Homework[]>('/api/homework');
  },

  async getPendingHomeworksCount() {
    return apiClient.get<{ pendingCount: number }>('/api/homework/pending-count');
  },

  async getHomework(id: string) {
    return apiClient.get<Homework>(`/api/homework/${id}`);
  },

  async updateHomework(id: string, data: Partial<CreateHomeworkData>) {
    return apiClient.put<Homework>(`/api/homework/${id}`, data);
  },

  async deleteHomework(id: string) {
    return apiClient.delete<{ message: string }>(`/api/homework/${id}`);
  }
};