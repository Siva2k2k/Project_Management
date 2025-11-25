import api from './api';

export interface WeeklyMetrics {
  _id: string;
  project: string | {
    _id: string;
    project_name: string;
  };
  week_start_date: string;
  week_end_date: string;
  rollup_hours: number;
  scope_completed: number;
  comments?: string;
  last_modified_date: string;
  last_modified_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyMetricsInput {
  project: string;
  week_start_date: string;
  week_end_date: string;
  rollup_hours: number;
  scope_completed: number;
  comments?: string;
}

export interface UpdateWeeklyMetricsInput {
  rollup_hours?: number;
  scope_completed?: number;
  comments?: string;
}

export interface WeeklyMetricsQuery {
  page?: number;
  limit?: number;
  project?: string;
  week_start_date?: string;
  sort?: 'week_start_date' | 'scope_completed' | 'rollup_hours' | 'createdAt' | 'last_modified_date';
  order?: 'asc' | 'desc';
}

class WeeklyMetricsService {
  async getAll(query?: WeeklyMetricsQuery) {
    const response = await api.get('/weekly-metrics', { params: query });
    return response.data;
  }

  async getById(id: string) {
    const response = await api.get(`/weekly-metrics/${id}`);
    return response.data;
  }

  async getByProject(projectId: string, query?: { page?: number; limit?: number; sort?: string; order?: 'asc' | 'desc' }) {
    const response = await api.get(`/weekly-metrics/project/${projectId}`, { params: query });
    return response.data;
  }

  async getTotalHoursByProject(projectId: string) {
    const response = await api.get(`/weekly-metrics/project/${projectId}/total-hours`);
    return response.data;
  }

  async getLatestByProject(projectId: string) {
    const response = await api.get(`/weekly-metrics/project/${projectId}/latest`);
    return response.data;
  }

  async create(data: CreateWeeklyMetricsInput) {
    const response = await api.post('/weekly-metrics', data);
    return response.data;
  }

  async update(id: string, data: UpdateWeeklyMetricsInput) {
    const response = await api.put(`/weekly-metrics/${id}`, data);
    return response.data;
  }

  async delete(id: string) {
    const response = await api.delete(`/weekly-metrics/${id}`);
    return response.data;
  }
}

export default new WeeklyMetricsService();
