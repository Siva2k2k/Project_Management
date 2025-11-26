import { api } from './api';

export interface Customer {
  _id: string;
  customer_name: string;
  email: string;
  contact_info?: string;
  created_by: string;
  is_deleted: boolean;
  last_modified_date: string;
  last_modified_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  customer_name: string;
  email: string;
  contact_info?: string;
}

export interface UpdateCustomerInput {
  customer_name?: string;
  email?: string;
  contact_info?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const customerService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Customer>> {
    const response = await api.get('/customers', { params });
    return {
      success: response.data.success,
      data: response.data.data,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      total: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
    };
  },

  async getById(id: string): Promise<Customer> {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  async create(data: CreateCustomerInput): Promise<Customer> {
    const response = await api.post('/customers', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateCustomerInput): Promise<Customer> {
    const response = await api.put(`/customers/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  async search(query: string): Promise<Customer[]> {
    const response = await api.get(`/customers/search`, { params: { q: query } });
    return response.data.data;
  },
};

export default customerService;
