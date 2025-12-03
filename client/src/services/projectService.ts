import { api } from './api';

export const ProjectType = {
  FIXED_PRICE: 'FP' as const,
  TIME_MATERIAL: 'TM' as const,
};

export type ProjectType = typeof ProjectType[keyof typeof ProjectType];

export const RAGStatus = {
  RED: 'Red' as const,
  AMBER: 'Amber' as const,
  GREEN: 'Green' as const,
};

export type RAGStatus = typeof RAGStatus[keyof typeof RAGStatus];

export const ProjectTrackingBy = {
  ENDDATE: 'EndDate' as const,
  MILESTONE: 'Milestone' as const,
};

export type ProjectTrackingBy = typeof ProjectTrackingBy[keyof typeof ProjectTrackingBy];

export const ProjectStatus = {
  ACTIVE: 'Active' as const,
  COMPLETED: 'Completed' as const,
  DEFERRED: 'Deferred' as const,
};

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

export const HourlyRateSource = {
  RESOURCE: 'Resource' as const,
  PROJECT: 'Project' as const,
  ORGANIZATION: 'Organization' as const,
};

export type HourlyRateSource = typeof HourlyRateSource[keyof typeof HourlyRateSource];

export interface Milestone {
  _id?: string;
  description: string;
  estimated_date: string;
  estimated_effort: number;
  scope_completed: number;
  completed_date?: string;
}

export interface Project {
  _id: string;
  project_name: string;
  start_date: string;
  end_date: string;
  project_type: ProjectType;
  estimated_effort: number;
  estimated_budget: number;
  estimated_resources: number;
  scope_completed: number;
  milestones: Milestone[];
  overall_status: RAGStatus;
  assigned_manager: { _id: string; name: string; email: string };
  tracking_by?: ProjectTrackingBy;
  scope_status: RAGStatus;
  quality_status: RAGStatus;
  budget_status: RAGStatus;
  customer: { _id: string; customer_name: string };
  resources?: Array<{ _id: string; resource_name: string; email: string }>;
  project_status: ProjectStatus;
  hourly_rate?: number;
  hourly_rate_source: HourlyRateSource;
  estimation?: string;
  scope_estimation?: string;
  is_deleted: boolean;
  last_modified_date: string;
  last_modified_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  project_name: string;
  start_date: string;
  end_date: string;
  project_type: ProjectType;
  estimated_effort: number;
  estimated_budget: number;
  estimated_resources: number;
  scope_completed?: number;
  milestones?: Omit<Milestone, '_id'>[];
  overall_status?: RAGStatus;
  assigned_manager: string;
  tracking_by?: ProjectTrackingBy;
  scope_status?: RAGStatus;
  quality_status?: RAGStatus;
  budget_status?: RAGStatus;
  customer: string;
  resources?: string[];
  project_status?: ProjectStatus;
  hourly_rate?: number;
  hourly_rate_source?: HourlyRateSource;
  estimation?: string;
  scope_estimation?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const projectService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    assigned_manager?: string;
    customer?: string;
    overall_status?: RAGStatus;
    project_type?: ProjectType;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Project>> {
    const response = await api.get('/projects', { params });
    return {
      success: response.data.success,
      data: response.data.data,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      total: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
    };
  },

  async getById(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data.data;
  },

  async getStats(managerId?: string): Promise<{
    total: number;
    byStatus: Record<RAGStatus, number>;
    byType: Record<ProjectType, number>;
  }> {
    const response = await api.get('/projects/stats', { params: { managerId } });
    return response.data.data;
  },

  async getByManager(managerId: string): Promise<Project[]> {
    const response = await api.get(`/projects/manager/${managerId}`);
    return response.data.data;
  },

  async getByCustomer(customerId: string): Promise<Project[]> {
    const response = await api.get(`/projects/customer/${customerId}`);
    return response.data.data;
  },

  async create(data: CreateProjectInput): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateProjectInput>): Promise<Project> {
    const response = await api.put(`/projects/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async addMilestone(
    projectId: string,
    milestone: Omit<Milestone, '_id'>
  ): Promise<Project> {
    const response = await api.post(`/projects/${projectId}/milestones`, milestone);
    return response.data.data;
  },

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    data: { scope_completed?: number; completed_date?: string }
  ): Promise<Project> {
    const response = await api.put(`/projects/${projectId}/milestones/${milestoneId}`, data);
    return response.data.data;
  },

  async removeMilestone(projectId: string, milestoneId: string): Promise<Project> {
    const response = await api.delete(`/projects/${projectId}/milestones/${milestoneId}`);
    return response.data.data;
  },
};

export default projectService;
