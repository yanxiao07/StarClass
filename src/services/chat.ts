import { apiClient } from './client';

export const chatApi = {
  async getClassMessages(classId: string): Promise<any[]> {
    return apiClient.get(`/api/chat/class/${classId}`);
  },

  async sendClassMessage(classId: string, data: { content?: string; imageUrl?: string; file?: File }): Promise<any> {
    return apiClient.post(`/api/chat/class/${classId}`, { content: data.content });
  },

  async uploadChatImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData('/api/chat/upload-chat-image', formData);
  },

  async muteStudent(studentId: string, mutedUntil?: string): Promise<any> {
    return apiClient.post(`/api/chat/students/${studentId}/mute`, { mutedUntil });
  },

  async unmuteStudent(studentId: string): Promise<any> {
    return apiClient.post(`/api/chat/students/${studentId}/unmute`);
  },

  async muteAllStudents(classId: string): Promise<any> {
    return apiClient.post(`/api/chat/classes/${classId}/mute-all`);
  },

  async unmuteAllStudents(classId: string): Promise<any> {
    return apiClient.post(`/api/chat/classes/${classId}/unmute-all`);
  },
};
