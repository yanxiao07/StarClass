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
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', data);
  },

  async login(data: LoginData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', data);
  },

  async getCurrentUser(): Promise<{ user: AuthResponse['user'] }> {
    return apiClient.get('/api/auth/me');
  },

  async uploadAvatar(file: File): Promise<{ user: any; avatarUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData('/api/auth/upload-avatar', formData);
  },
};
