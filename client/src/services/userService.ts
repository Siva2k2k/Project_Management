import api from './api';
import type { User } from '../types';

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BulkImportUser {
  name: string;
  email: string;
  password?: string;
  role?: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export const userService = {
  async getProfile(): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>('/users/profile');
    return response.data.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>('/users/profile', data);
    return response.data.data;
  },

  async updateAvatar(avatarUrl: string): Promise<User> {
    const response = await api.post<{ success: boolean; data: User }>('/users/avatar', {
      avatarUrl,
    });
    return response.data.data;
  },

  async deactivateAccount(): Promise<void> {
    await api.delete('/users/account');
  },

  async listUsers(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
    const response = await api.get('/users', { params });
    return {
      success: response.data.success,
      data: response.data.data,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      total: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
    };
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>(`/users/${id}`);
    return response.data.data;
  },

  async updateUserRole(id: string, role: string): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/users/${id}/role`, {
      role,
    });
    return response.data.data;
  },

  async activateUser(id: string): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/users/${id}/activate`);
    return response.data.data;
  },

  async deactivateUser(id: string): Promise<void> {
    await api.put(`/users/${id}/deactivate`);
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async bulkImportUsers(users: BulkImportUser[]): Promise<BulkImportResult> {
    const response = await api.post<{ success: boolean; data: BulkImportResult }>(
      '/users/bulk-import',
      { users }
    );
    return response.data.data;
  },

  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post<{ success: boolean; data: User }>('/users/create', data);
    return response.data.data;
  },

  async resetUserPassword(id: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`);
  },

  async updateUser(id: string, data: UpdateProfileData): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/users/${id}`, data);
    return response.data.data;
  },
};

export default userService;
