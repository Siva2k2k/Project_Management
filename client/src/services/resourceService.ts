import { api } from './api';

export const ResourceStatus = {
  ACTIVE: 'Active' as const,
  INACTIVE: 'Inactive' as const,
};

export type ResourceStatus = typeof ResourceStatus[keyof typeof ResourceStatus];

export const Currency = {
  USD: 'USD' as const,
  INR: 'INR' as const,
  EUR: 'EUR' as const,
  GBP: 'GBP' as const,
};

export type Currency = typeof Currency[keyof typeof Currency];

export interface Resource {
  _id: string;
  resource_name: string;
  email: string;
  status: ResourceStatus;
  per_hour_rate: number;
  currency: Currency;
  last_modified_date: string;
  last_modified_by?: string;
  is_deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceInput {
  resource_name: string;
  email: string;
  status?: ResourceStatus;
  per_hour_rate: number;
  currency?: Currency;
}

export interface UpdateResourceInput {
  resource_name?: string;
  email?: string;
  status?: ResourceStatus;
  per_hour_rate?: number;
  currency?: Currency;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const resourceService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: ResourceStatus;
    currency?: Currency;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Resource>> {
    const response = await api.get('/resources', { params });
    return {
      success: response.data.success,
      data: response.data.data,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      total: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
    };
  },

  async getById(id: string): Promise<Resource> {
    const response = await api.get(`/resources/${id}`);
    return response.data.data;
  },

  async getActive(): Promise<Resource[]> {
    const response = await api.get('/resources/active');
    return response.data.data;
  },

  async create(data: CreateResourceInput): Promise<Resource> {
    const response = await api.post('/resources', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateResourceInput): Promise<Resource> {
    const response = await api.put(`/resources/${id}`, data);
    return response.data.data;
  },

  async updateStatus(id: string, status: ResourceStatus): Promise<Resource> {
    const response = await api.patch(`/resources/${id}/status`, { status });
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/resources/${id}`);
  },

  async search(query: string): Promise<Resource[]> {
    const response = await api.get(`/resources/search`, { params: { q: query } });
    return response.data.data;
  },
};

export default resourceService;
