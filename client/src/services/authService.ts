import api, { setAccessToken } from './api';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; accessToken: string }> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);
    return { user, accessToken };
  },

  async register(data: RegisterData): Promise<{ user: User; accessToken: string }> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);
    return { user, accessToken };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  async refreshToken(): Promise<string> {
    const response = await api.post<{ success: boolean; data: { accessToken: string } }>(
      '/auth/refresh'
    );
    const { accessToken } = response.data.data;
    setAccessToken(accessToken);
    return accessToken;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/change-password', { currentPassword, newPassword });
    setAccessToken(null);
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  getMicrosoftAuthUrl(): string {
    return `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/microsoft`;
  },
};

export default authService;
