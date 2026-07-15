import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../../types';
import { authApi } from '../../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    className?: string;
    studentId?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: any) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUser = (apiUser: any): User => {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    role: apiUser.role,
    classId: apiUser.class_id || apiUser.classId,
    className: apiUser.className || '',
    studentId: apiUser.studentId || '',
    nickname: apiUser.nickname || apiUser.name,
    avatar: apiUser.avatar || '',
    stars: apiUser.stars || 0,
    theme: apiUser.theme || 'default',
    chatBubbleStyle: apiUser.chat_bubble_style || apiUser.chatBubbleStyle || 'default',
    activeAvatar: apiUser.active_avatar || apiUser.activeAvatar || '',
    lastNicknameChange: apiUser.lastNicknameChange ? new Date(apiUser.lastNicknameChange) : undefined,
    lastAvatarChange: apiUser.lastAvatarChange ? new Date(apiUser.lastAvatarChange) : undefined,
    isMuted: apiUser.isMuted || false,
    mutedUntil: apiUser.mutedUntil ? new Date(apiUser.mutedUntil) : undefined,
    createdAt: apiUser.createdAt ? new Date(apiUser.createdAt) : new Date(),
    updatedAt: apiUser.updatedAt ? new Date(apiUser.updatedAt) : new Date(),
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUser(mapUser(response));
    } catch (error) {
      sessionStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUser(mapUser(response));
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    sessionStorage.setItem('token', response.access_token);
    const userResponse = await authApi.getCurrentUser();
    setUser(mapUser(userResponse));
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    className?: string;
    studentId?: string;
  }) => {
    const response = await authApi.register(data);
    sessionStorage.setItem('token', response.access_token);
    const userResponse = await authApi.getCurrentUser();
    setUser(mapUser(userResponse));
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updatedUser: any) => {
    setUser(mapUser(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
