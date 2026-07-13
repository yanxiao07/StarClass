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
  async updateProfile(data: { nickname?: string; avatar?: string }): Promise<any> {
    return apiClient.put('/api/users/profile', data);
  },
  
  async rewardStars(studentId: string, stars: number): Promise<any> {
    return apiClient.post('/api/users/reward-stars', { studentId, stars });
  },

  async getMyStats(): Promise<StudentStats> {
    return apiClient.get<StudentStats>('/api/users/my-stats');
  },

  async deleteAccount(): Promise<any> {
    return apiClient.delete('/api/users/delete-account');
  },
};
