import { apiClient } from './client';

export const storeApi = {
  async getStoreItems(): Promise<any[]> {
    return apiClient.get('/api/store/items');
  },

  async purchaseItem(itemId: string): Promise<any> {
    return apiClient.post(`/api/store/items/${itemId}/purchase`);
  },

  async getMyPurchases(): Promise<any[]> {
    return apiClient.get('/api/store/purchases');
  },

  async useItem(itemId: string): Promise<any> {
    return apiClient.post(`/api/store/items/${itemId}/use`);
  },
};
