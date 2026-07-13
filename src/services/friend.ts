import { apiClient } from './client';

export const friendApi = {
  async sendFriendRequest(friendId: string): Promise<any> {
    return apiClient.post(`/api/friend/friends/${friendId}/request`);
  },

  async acceptFriendRequest(requestId: string): Promise<any> {
    return apiClient.post(`/api/friend/friends/${requestId}/accept`);
  },

  async getFriends(): Promise<any[]> {
    return apiClient.get('/api/friend/friends');
  },

  async getPrivateMessages(friendId: string): Promise<any[]> {
    return apiClient.get(`/api/friend/messages/${friendId}`);
  },

  async sendPrivateMessage(friendId: string, data: { content?: string; imageUrl?: string }): Promise<any> {
    return apiClient.post(`/api/friend/messages/${friendId}`, data);
  },
};
