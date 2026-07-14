import { apiClient } from './client';

export interface StudentStats {
  id: string;
  studentId: string;
  homeworkCompletion: number;
  accuracy: number;
  participation: number;
  creativity: number;
  teamwork: number;
  improvement: number;
  level: number;
}

export const userApi = {
  async updateProfile(data: { nickname?: string; avatar?: string; name?: string }): Promise<any> {
    return apiClient.put('/api/users/me', data);
  },

  async rewardStars(studentId: string, stars: number): Promise<any> {
    return apiClient.post('/api/users/reward-stars', { studentId, stars });
  },

  async getMyStats(): Promise<StudentStats> {
    return apiClient.get<StudentStats>('/api/users/me/my-stats');
  },

  async deleteAccount(): Promise<any> {
    return apiClient.delete('/api/users/delete-account');
  },
};
