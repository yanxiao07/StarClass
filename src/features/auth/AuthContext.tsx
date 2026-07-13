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
    classId: apiUser.classId,
    className: apiUser.className,
    studentId: apiUser.studentId,
    nickname: apiUser.nickname,
    avatar: apiUser.avatar,
    stars: apiUser.stars,
    theme: apiUser.theme,
    chatBubbleStyle: apiUser.chatBubbleStyle,
    lastNicknameChange: apiUser.lastNicknameChange ? new Date(apiUser.lastNicknameChange) : undefined,
    lastAvatarChange: apiUser.lastAvatarChange ? new Date(apiUser.lastAvatarChange) : undefined,
    isMuted: apiUser.isMuted,
    mutedUntil: apiUser.mutedUntil ? new Date(apiUser.mutedUntil) : undefined,
    createdAt: new Date(apiUser.createdAt),
    updatedAt: new Date(apiUser.updatedAt),
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
      setUser(mapUser(response.user));
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
      setUser(mapUser(response.user));
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    sessionStorage.setItem('token', response.token);
    setUser(mapUser(response.user));
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
    sessionStorage.setItem('token', response.token);
    setUser(mapUser(response.user));
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
