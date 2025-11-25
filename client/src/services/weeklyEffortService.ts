import { api } from './api';

export interface MilestoneUpdate {
  milestone_id: string;
  scope_completed: number;
  notes?: string;
}

export interface WeeklyEffort {
  _id: string;
  project: { _id: string; project_name: string };
  resource: { _id: string; resource_name: string; email: string };
  hours: number;
  week_start_date: string;
  week_end_date: string;
  scope_update?: string;
  budget_update?: string;
  quality_update?: string;
  milestone_updates: MilestoneUpdate[];
  last_modified_date: string;
  last_modified_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyEffortInput {
  project: string;
  resource: string;
  hours: number;
  week_start_date: string;
  week_end_date: string;
  scope_update?: string;
  budget_update?: string;
  quality_update?: string;
  milestone_updates?: MilestoneUpdate[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const weeklyEffortService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    project?: string;
    resource?: string;
    week_start_date?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<WeeklyEffort>> {
    const response = await api.get('/weekly-efforts', { params });
    return response.data;
  },

  async getById(id: string): Promise<WeeklyEffort> {
    const response = await api.get(`/weekly-efforts/${id}`);
    return response.data.data;
  },

  async getByProject(
    projectId: string,
    params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<WeeklyEffort>> {
    const response = await api.get(`/weekly-efforts/project/${projectId}`, { params });
    return response.data;
  },

  async getByResource(
    resourceId: string,
    params?: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<WeeklyEffort>> {
    const response = await api.get(`/weekly-efforts/resource/${resourceId}`, { params });
    return response.data;
  },

  async getTotalHoursByProject(projectId: string): Promise<number> {
    const response = await api.get(`/weekly-efforts/project/${projectId}/total-hours`);
    return response.data.data.totalHours;
  },

  async getResourceAllocation(
    projectId: string
  ): Promise<Array<{ resource: string; resourceName: string; totalHours: number }>> {
    const response = await api.get(`/weekly-efforts/project/${projectId}/resource-allocation`);
    return response.data.data;
  },

  async create(data: CreateWeeklyEffortInput): Promise<WeeklyEffort> {
    const response = await api.post('/weekly-efforts', data);
    return response.data.data;
  },

  async update(
    id: string,
    data: Partial<Omit<CreateWeeklyEffortInput, 'project' | 'resource' | 'week_start_date' | 'week_end_date'>>
  ): Promise<WeeklyEffort> {
    const response = await api.put(`/weekly-efforts/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/weekly-efforts/${id}`);
  },

  async bulkCreate(entries: CreateWeeklyEffortInput[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const response = await api.post('/weekly-efforts/bulk', { entries });
    return response.data.data;
  },
};

export default weeklyEffortService;
