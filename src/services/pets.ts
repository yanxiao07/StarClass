import { apiClient } from './client';

// 宠物种类定义
export interface PetType {
  id: string;
  name: string;
  species: string;
  description: string;
  price: number;
  modelType: string;
  colorPrimary: string;
  colorSecondary: string;
}

// 用户宠物实例
export interface UserPet {
  id: string;
  userId: string;
  petTypeId: string;
  name: string;
  level: number;
  exp: number;
  hunger: number;
  mood: number;
  isActive: boolean;
  hatched: boolean;
  lastFedAt: string;
  lastInteractionAt: string;
  createdAt: string;
  petType?: PetType;
}

// 升级所需经验表
export const EXP_THRESHOLDS: Record<number, number> = {
  1: 40, 2: 80, 3: 140, 4: 220, 5: 320, 6: 440, 7: 580, 8: 0,
};

// 宠物模型类型映射
export const PET_MODEL_MAP: Record<string, 'fox' | 'cat' | 'dragon' | 'bird'> = {
  fox: 'fox',
  cat: 'cat',
  dragon: 'dragon',
  bird: 'bird',
};

export const petApi = {
  // 获取我的所有宠物
  async getMyPets() {
    return apiClient.get<UserPet[]>('/api/pets/my');
  },

  // 获取当前展示宠物
  async getActivePet() {
    return apiClient.get<UserPet | null>('/api/pets/active');
  },

  // 设为展示宠物
  async activatePet(userPetId: string) {
    return apiClient.post<{ message: string }>(`/api/pets/${userPetId}/activate`);
  },

  // 喂养宠物
  async feedPet(userPetId: string, foodType: 'basic' | 'premium') {
    return apiClient.post<{ message: string; pet: UserPet; leveledUp?: boolean }>(
      `/api/pets/${userPetId}/feed`,
      { foodType }
    );
  },

  // 互动（抚摸）
  async interactPet(userPetId: string) {
    return apiClient.post<{ message: string; pet: UserPet; leveledUp?: boolean }>(
      `/api/pets/${userPetId}/interact`
    );
  },

  // 重命名
  async renamePet(userPetId: string, name: string) {
    return apiClient.post<{ message: string }>(`/api/pets/${userPetId}/rename`, { name });
  },

  // 获取状态
  async getPetStatus(userPetId: string) {
    return apiClient.get<UserPet>(`/api/pets/${userPetId}/status`);
  },

  // 作业完成奖励
  async rewardHomework(exp = 10) {
    return apiClient.post<{ message: string; pet: UserPet | null; leveledUp?: boolean }>(
      '/api/pets/reward/homework',
      { exp }
    );
  },
};
