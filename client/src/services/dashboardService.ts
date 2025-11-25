import api from './api';

export interface ProjectSummary {
  _id: string;
  project_name: string;
  customer: string;
  overall_status: string;
  scope_status: string;
  quality_status: string;
  budget_status: string;
  scope_completed: number;
  estimated_budget: number;
  start_date: string;
  end_date: string;
  project_type: string;
}

export interface DashboardData {
  projectsSummary: ProjectSummary[];
  projectsByCustomer: Array<{ customer: string; count: number }>;
  projectsByStatus: Array<{ status: string; count: number }>;
  effortByWeek: Array<{ week: string; hours: number }>;
  budgetUtilization: Array<{ project: string; estimated: number; actual: number }>;
  resourceAllocation: Array<{ resource: string; hours: number; projects: number }>;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
}

export interface KPIData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  projectHealthScore: number;
  budgetVariance: number;
  scheduleVariance: number;
  resourceUtilization: number;
  onTimeCompletionRate: number;
  overallCompletionRate: number;
}

export interface TrendData {
  effortTrend: Array<{ date: string; hours: number }>;
  budgetTrend: Array<{ date: string; cost: number }>;
  scopeTrend: Array<{ date: string; scope_completed: number; project: string }>;
}

export interface ProjectDrillDownData {
  project: ProjectSummary;
  effortByResource: Array<{ resource: string; hours: number }>;
  budgetTrend: Array<{ week: string; estimated: number; actual: number }>;
  scopeTrend: Array<{ week: string; scope_completed: number }>;
  milestones: Array<{
    description: string;
    estimated_date: string;
    completed_date?: string;
    scope_completed: number;
    status: string;
  }>;
  totalEffortHours: number;
  actualCost: number;
}

export const dashboardService = {
  async getManagerDashboard(): Promise<DashboardData> {
    const response = await api.get('/dashboard/manager');
    return response.data.data;
  },

  async getCEODashboard(): Promise<DashboardData> {
    const response = await api.get('/dashboard/ceo');
    return response.data.data;
  },

  async getProjectDrillDown(projectId: string): Promise<ProjectDrillDownData> {
    const response = await api.get(`/dashboard/project/${projectId}`);
    return response.data.data;
  },

  async getKPIs(): Promise<KPIData> {
    const response = await api.get('/dashboard/kpis');
    return response.data.data;
  },

  async getTrends(params?: { projectId?: string; timeRange?: number }): Promise<TrendData> {
    const response = await api.get('/dashboard/trends', { params });
    return response.data.data;
  },
};
