import { apiClient } from './client';
import { UserRole } from '../types';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  className?: string;
  studentId?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role: UserRole;
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  nickname: string;
  role: UserRole;
  class_id: string | null;
  stars: number;
  level: number;
}

export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      nickname: data.name,
    });
  },

  async login(data: LoginData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', data);
  },

  async getCurrentUser(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/api/auth/me');
  },

  async uploadAvatar(file: File): Promise<{ user: any; avatarUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData('/api/auth/upload-avatar', formData);
  },
};
