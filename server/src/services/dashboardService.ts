import { Types } from 'mongoose';
import { projectRepository } from '../dbrepo/ProjectRepository';
import { projectWeeklyEffortRepository } from '../dbrepo/ProjectWeeklyEffortRepository';
import { projectWeeklyMetricsRepository } from '../dbrepo/ProjectWeeklyMetricsRepository';
import { NotFoundError } from '../utils/errors';
import { getDaysAgoUTC, toISODateString } from '../utils/dateUtils';
import { ICustomer, IResource, IProject as IProjectDoc, ProjectStatus, HourlyRateSource } from '../types';
import { config } from '../config';

// Helper type guards
function isPopulatedCustomer(customer: Types.ObjectId | ICustomer): customer is ICustomer {
  return typeof customer === 'object' && 'customer_name' in customer;
}

function isPopulatedResource(resource: Types.ObjectId | IResource): resource is IResource {
  return typeof resource === 'object' && 'resource_name' in resource;
}

function isPopulatedProject(project: Types.ObjectId | IProjectDoc): project is IProjectDoc {
  return typeof project === 'object' && 'project_name' in project;
}

// Helper: Get hourly rate based on project configuration
function getHourlyRate(project: IProjectDoc, resource?: IResource): number {
  let rate: number;
  
  switch (project.hourly_rate_source) {
    case HourlyRateSource.PROJECT:
      rate = project.hourly_rate || config.organizationalHourlyRate;
      break;
    case HourlyRateSource.RESOURCE:
      rate = resource?.per_hour_rate || config.organizationalHourlyRate;
      break;
    case HourlyRateSource.ORGANIZATION:
    default:
      rate = config.organizationalHourlyRate;
      break;
  }
  
  // Ensure we return a valid positive number
  if (typeof rate !== 'number' || isNaN(rate) || rate < 0) {
    return config.organizationalHourlyRate;
  }
  
  return rate;
}


// Helper: Calculate actual cost for efforts with proper hourly rate
async function calculateActualCost(efforts: any[], project: IProjectDoc): Promise<number> {
  // Validate inputs
  if (!Array.isArray(efforts) || !project) {
    return 0;
  }

  let totalCost = 0;
  
  for (const effort of efforts) {
    // Skip invalid effort records
    if (!effort || typeof effort.hours !== 'number' || isNaN(effort.hours) || effort.hours < 0) {
      continue;
    }

    // Skip efforts with null/deleted resources
    if (!effort.resource) {
      continue;
    }

    const resource = isPopulatedResource(effort.resource) ? effort.resource : undefined;
    const hourlyRate = getHourlyRate(project, resource);
    
    // Validate hourly rate
    if (typeof hourlyRate !== 'number' || isNaN(hourlyRate) || hourlyRate < 0) {
      continue;
    }

    const cost = effort.hours * hourlyRate;
    
    // Validate calculated cost
    if (typeof cost === 'number' && !isNaN(cost)) {
      totalCost += cost;
    }
  }
  
  return totalCost;
}

interface ProjectSummary {
  _id: string;
  project_name: string;
  customer: string;
  overall_status: string;
  scope_status: string;
  quality_status: string;
  budget_status: string;
  scope_completed: number;
  estimated_budget: number;
  start_date: Date;
  end_date: Date;
  project_type: string;
}

interface DashboardData {
  projectsSummary: ProjectSummary[];
  projectsByCustomer: Array<{ customer: string; count: number }>;
  projectsByStatus: Array<{ status: string; count: number }>;
  effortByWeek: Array<{ week: string; [projectName: string]: string | number }>;
  budgetUtilization: Array<{ project: string; estimated: number; actual: number }>;
  resourceAllocation: Array<{ resource: string; hours: number; projects: number }>;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
}

export async function getManagerDashboard(userId: string): Promise<DashboardData> {
  const projects = await projectRepository.findByManager(userId);

  // Calculate project summaries
  const projectsSummary = projects.map((p) => ({
    _id: p._id.toString(),
    project_name: p.project_name,
    customer: isPopulatedCustomer(p.customer) ? p.customer.customer_name : 'Unknown',
    overall_status: p.overall_status,
    scope_status: p.scope_status,
    quality_status: p.quality_status,
    budget_status: p.budget_status,
    scope_completed: p.scope_completed,
    estimated_budget: p.estimated_budget,
    start_date: p.start_date,
    end_date: p.end_date,
    project_type: p.project_type,
  }));

  // Projects by customer
  const customerMap = new Map<string, number>();
  projects.forEach((p) => {
    const customer = isPopulatedCustomer(p.customer) ? p.customer.customer_name : 'Unknown';
    customerMap.set(customer, (customerMap.get(customer) || 0) + 1);
  });
  const projectsByCustomer = Array.from(customerMap.entries()).map(([customer, count]) => ({
    customer,
    count,
  }));

  // Projects by RAG status
  const statusMap = new Map<string, number>();
  projects.forEach((p) => {
    statusMap.set(p.overall_status, (statusMap.get(p.overall_status) || 0) + 1);
  });
  const projectsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // Effort by week - last 12 weeks with project breakdown
  const projectIds = projects.map((p) => p._id.toString());
  const twelveWeeksAgo = getDaysAgoUTC(84);

  // Get project-specific effort data
  const projectEffortData = await projectWeeklyEffortRepository.getEffortByWeekByProject(projectIds, twelveWeeksAgo);
  
  // Get all unique weeks and projects for complete data structure
  const allWeeks = new Set<string>();
  const allProjects = new Set<string>();
  
  projectEffortData.forEach(item => {
    allWeeks.add(toISODateString(item.week_start_date));
    allProjects.add(item.project_name.replace(/\s+/g, '_'));
  });
  
  // Sort weeks chronologically
  const sortedWeeks = Array.from(allWeeks).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );
  
  // Transform data for multi-line chart - ensure all weeks have all projects
  const weekMap = new Map<string, any>();
  
  // Initialize all weeks with all projects set to 0
  sortedWeeks.forEach(weekKey => {
    const weekData: any = { week: weekKey };
    allProjects.forEach(projectKey => {
      weekData[projectKey] = 0; // Initialize with 0
    });
    weekMap.set(weekKey, weekData);
  });
  
  // Fill in actual effort data
  projectEffortData.forEach(item => {
    const weekKey = toISODateString(item.week_start_date);
    const projectKey = item.project_name.replace(/\s+/g, '_');
    const weekData = weekMap.get(weekKey);
    if (weekData) {
      weekData[projectKey] = item.total_hours;
    }
  });

  // Convert to array
  const effortByWeek = Array.from(weekMap.values());

  // Budget utilization
  const budgetUtilization = await Promise.all(
    projects.slice(0, 10).map(async (p) => {
      const efforts = await projectWeeklyEffortRepository.findAllByProject(p._id.toString());
      const actualCost = await calculateActualCost(efforts, p);
      return {
        project: p.project_name,
        estimated: p.estimated_budget,
        actual: actualCost,
      };
    })
  );

  // Resource allocation
  const resourceData = await projectWeeklyEffortRepository.getResourceAllocation(projectIds);
  const resourceAllocation = resourceData.map((r) => ({
    resource: r.resource_name,
    hours: r.total_hours,
    projects: r.project_count,
  }));

  // Statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.project_status === ProjectStatus.ACTIVE).length;
  const completedProjects = projects.filter((p) => p.project_status === ProjectStatus.COMPLETED).length;
  const atRiskProjects = projects.filter((p) => p.overall_status === 'Red').length;

  return {
    projectsSummary,
    projectsByCustomer,
    projectsByStatus,
    effortByWeek,
    budgetUtilization,
    resourceAllocation,
    totalProjects,
    activeProjects,
    completedProjects,
    atRiskProjects,
  };
}

export async function getCEODashboard(): Promise<DashboardData> {
  const projects = await projectRepository.findAll();

  // Reuse the same logic as manager dashboard but for all projects
  const projectsSummary = projects.map((p) => ({
    _id: p._id.toString(),
    project_name: p.project_name,
    customer: isPopulatedCustomer(p.customer) ? p.customer.customer_name : 'Unknown',
    overall_status: p.overall_status,
    scope_status: p.scope_status,
    quality_status: p.quality_status,
    budget_status: p.budget_status,
    scope_completed: p.scope_completed,
    estimated_budget: p.estimated_budget,
    start_date: p.start_date,
    end_date: p.end_date,
    project_type: p.project_type,
  }));

  const customerMap = new Map<string, number>();
  projects.forEach((p) => {
    const customer = isPopulatedCustomer(p.customer) ? p.customer.customer_name : 'Unknown';
    customerMap.set(customer, (customerMap.get(customer) || 0) + 1);
  });
  const projectsByCustomer = Array.from(customerMap.entries()).map(([customer, count]) => ({
    customer,
    count,
  }));

  const statusMap = new Map<string, number>();
  projects.forEach((p) => {
    statusMap.set(p.overall_status, (statusMap.get(p.overall_status) || 0) + 1);
  });
  const projectsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const projectIds = projects.map((p) => p._id.toString());
  const twelveWeeksAgo = getDaysAgoUTC(84);

  const effortData = await projectWeeklyEffortRepository.getEffortByWeek(projectIds, twelveWeeksAgo);
  const effortByWeek = effortData.map((e) => ({
    week: toISODateString(e.week_start_date),
    hours: e.total_hours,
  }));

  const budgetUtilization = await Promise.all(
    projects.slice(0, 10).map(async (p) => {
      const efforts = await projectWeeklyEffortRepository.findAllByProject(p._id.toString());
      const actualCost = await calculateActualCost(efforts, p);
      return {
        project: p.project_name,
        estimated: p.estimated_budget,
        actual: actualCost,
      };
    })
  );

  const resourceData = await projectWeeklyEffortRepository.getResourceAllocation(projectIds);
  const resourceAllocation = resourceData.map((r) => ({
    resource: r.resource_name,
    hours: r.total_hours,
    projects: r.project_count,
  }));

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.project_status === ProjectStatus.ACTIVE).length;
  const completedProjects = projects.filter((p) => p.project_status === ProjectStatus.COMPLETED).length;
  const atRiskProjects = projects.filter((p) => p.overall_status === 'Red').length;

  return {
    projectsSummary,
    projectsByCustomer,
    projectsByStatus,
    effortByWeek,
    budgetUtilization,
    resourceAllocation,
    totalProjects,
    activeProjects,
    completedProjects,
    atRiskProjects,
  };
}

// Helper: Extract unique resource names from efforts
function extractResourceNames(efforts: any[]): Set<string> {
  const resourceNames = new Set<string>();
  efforts.forEach((e) => {
    // Skip efforts with null/deleted resources
    if (!e.resource) {
      return;
    }
    const resourceName = isPopulatedResource(e.resource) ? e.resource.resource_name : 'Unknown';
    resourceNames.add(resourceName);
  });
  return resourceNames;
}

// Helper: Build cumulative effort data by week and resource
function buildCumulativeEffortData(
  sortedEfforts: any[],
  resourceNames: Set<string>
): Map<string, Map<string, number>> {
  const weekMap = new Map<string, Map<string, number>>();
  const cumulativeMap = new Map<string, number>();
  
  // Initialize cumulative counters
  resourceNames.forEach(name => cumulativeMap.set(name, 0));

  sortedEfforts.forEach((e) => {
    // Skip efforts with null/deleted resources
    if (!e.resource) {
      return;
    }
    const week = toISODateString(e.week_start_date);
    const resourceName = isPopulatedResource(e.resource) ? e.resource.resource_name : 'Unknown';
    
    // Update cumulative hours
    const currentCumulative = cumulativeMap.get(resourceName) || 0;
    cumulativeMap.set(resourceName, currentCumulative + e.hours);
    
    // Store week data
    if (!weekMap.has(week)) {
      weekMap.set(week, new Map());
    }
    const weekData = weekMap.get(week)!;
    weekData.set(resourceName, cumulativeMap.get(resourceName) || 0);
  });

  return weekMap;
}

// Helper: Convert week map to chart-friendly format
function formatEffortByResource(
  weekMap: Map<string, Map<string, number>>,
  resourceNames: Set<string>
): any[] {
  return Array.from(weekMap.entries()).map(([week, resources]) => {
    const entry: any = { week };
    resourceNames.forEach(resourceName => {
      entry[resourceName] = resources.get(resourceName) || 0;
    });
    return entry;
  });
}

// Helper: Calculate budget trend over time
function calculateBudgetTrend(efforts: any[], estimatedBudget: number, project: IProjectDoc): any[] {
  const sortedEfforts = [...efforts].sort((a, b) => 
    new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime()
  );

  let cumulativeCost = 0;
  return sortedEfforts.map((e) => {
    const resource = isPopulatedResource(e.resource) ? e.resource : undefined;
    const hourlyRate = getHourlyRate(project, resource);
    cumulativeCost += e.hours * hourlyRate;
    return {
      week: toISODateString(e.week_start_date),
      estimated: estimatedBudget,
      actual: cumulativeCost,
    };
  });
}

// Helper: Format milestone status
function formatMilestones(milestones: any[]): any[] {
  return milestones.map((m) => ({
    description: m.description,
    estimated_date: m.estimated_date,
    completed_date: m.completed_date,
    scope_completed: m.scope_completed,
    status: m.completed_date ? 'Completed' : new Date() > m.estimated_date ? 'Delayed' : 'On Track',
  }));
}

// Helper: Calculate project statistics
async function calculateProjectStats(efforts: any[], project: IProjectDoc) {
  // Validate input data
  if (!Array.isArray(efforts)) {
    return { totalEffortHours: 0, actualCost: 0, effortPercentage: 0, costPercentage: 0 };
  }

  const totalEffortHours = efforts.reduce((sum, e) => {
    const hours = typeof e.hours === 'number' && !isNaN(e.hours) ? e.hours : 0;
    return sum + hours;
  }, 0);
  
  const actualCost = await calculateActualCost(efforts, project);
  
  // Calculate percentages with proper mathematical precision
  const effortPercentage = project.estimated_effort > 0 && !isNaN(project.estimated_effort)
    ? Math.round((totalEffortHours / project.estimated_effort) * 100 * 10) / 10 // One decimal place precision
    : 0;
    
  const costPercentage = project.estimated_budget > 0 && !isNaN(project.estimated_budget)
    ? Math.round((actualCost / project.estimated_budget) * 100 * 10) / 10 // One decimal place precision
    : 0;

  return { totalEffortHours, actualCost, effortPercentage, costPercentage };
}

export async function getProjectDrillDown(projectId: string) {
  const project = await projectRepository.findByIdWithPopulate(projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const efforts = await projectWeeklyEffortRepository.findAllByProject(projectId);
  const sortedEfforts = efforts.sort((a, b) => 
    new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime()
  );

  // Build effort breakdown by resource
  const resourceNames = extractResourceNames(sortedEfforts);
  const weekMap = buildCumulativeEffortData(sortedEfforts, resourceNames);
  const effortByResource = formatEffortByResource(weekMap, resourceNames);

  // Calculate budget trend
  const budgetTrend = calculateBudgetTrend(efforts, project.estimated_budget, project);

  // Fetch scope progress
  const weeklyMetrics = await projectWeeklyMetricsRepository.findByProject(
    projectId,
    { page: 1, limit: 100, sort: 'week_start_date', order: 'asc' }
  );
  const scopeTrend = weeklyMetrics.data.map((m) => ({
    week: toISODateString(m.week_start_date),
    scope_completed: m.scope_completed || 0,
    comments: m.comments || '',
  }));

  // Calculate week-over-week scope change
  const scopeChangeTrend = weeklyMetrics.data.map((m, index) => {
    const currentScope = m.scope_completed || 0;
    const previousScope = index > 0 ? (weeklyMetrics.data[index - 1].scope_completed || 0) : 0;
    const scopeChange = currentScope - previousScope;
    
    return {
      week: toISODateString(m.week_start_date),
      scope_change: scopeChange,
      current_scope: currentScope,
      previous_scope: previousScope,
      comments: m.comments || '',
    };
  });

  // Format milestones and calculate stats
  const milestones = formatMilestones(project.milestones);
  const stats = await calculateProjectStats(efforts, project);

  return {
    project: {
      _id: project._id.toString(),
      project_name: project.project_name,
      customer: isPopulatedCustomer(project.customer) ? project.customer.customer_name : 'Unknown',
      overall_status: project.overall_status,
      scope_status: project.scope_status,
      quality_status: project.quality_status,
      budget_status: project.budget_status,
      scope_completed: project.scope_completed,
      estimated_budget: project.estimated_budget,
      estimated_effort: project.estimated_effort,
      start_date: project.start_date,
      end_date: project.end_date,
      project_type: project.project_type,
    },
    effortByResource,
    budgetTrend,
    scopeTrend,
    scopeChangeTrend,
    milestones,
    ...stats,
  };
}

// Helper: Count on-time completed projects
function countOnTimeProjects(projects: any[]): number {
  return projects.filter((p) => {
    if (p.project_status !== ProjectStatus.COMPLETED) return false;
    
    // For projects tracked by end date
    if (p.tracking_by === 'EndDate') {
      // Check if project was completed on or before the estimated end date
      const endDate = new Date(p.end_date);
      const completedDate = new Date(p.completed_date || p.last_modified_date);
      return completedDate <= endDate;
    }
    
    // For projects tracked by milestones
    if (p.milestones && p.milestones.length > 0) {
      const completedMilestones = p.milestones.filter((m: any) => m.completed_date);
      if (completedMilestones.length === 0) return false;
      
      const onTimeMilestones = completedMilestones.filter(
        (m: any) => m.completed_date && new Date(m.completed_date) <= new Date(m.estimated_date)
      );
      
      return onTimeMilestones.length === completedMilestones.length;
    }
    
    // Default: if no milestones and no clear tracking, consider on-time if completed
    return true;
  }).length;
}

// Helper: Calculate budget and effort totals
async function calculateBudgetAndEffortTotals(
  projects: IProjectDoc[],
  efforts: any[][]
): Promise<{ totalEstimatedBudget: number; totalActualCost: number; totalEstimatedEffort: number; totalActualEffort: number }> {
  let totalEstimatedBudget = 0;
  let totalActualCost = 0;
  let totalEstimatedEffort = 0;
  let totalActualEffort = 0;

  // Validate input arrays match in length
  if (!Array.isArray(projects) || !Array.isArray(efforts) || projects.length !== efforts.length) {
    return { totalEstimatedBudget: 0, totalActualCost: 0, totalEstimatedEffort: 0, totalActualEffort: 0 };
  }

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    if (!p) continue;

    // Validate and accumulate estimated values
    const estimatedBudget = typeof p.estimated_budget === 'number' && !isNaN(p.estimated_budget) ? p.estimated_budget : 0;
    const estimatedEffort = typeof p.estimated_effort === 'number' && !isNaN(p.estimated_effort) ? p.estimated_effort : 0;
    
    totalEstimatedBudget += estimatedBudget;
    totalEstimatedEffort += estimatedEffort;
    
    // Calculate actual values
    const projectEfforts = Array.isArray(efforts[i]) ? efforts[i] : [];
    const actualHours = projectEfforts.reduce((sum, e) => {
      const hours = typeof e?.hours === 'number' && !isNaN(e.hours) ? e.hours : 0;
      return sum + hours;
    }, 0);
    
    totalActualEffort += actualHours;
    
    const cost = await calculateActualCost(projectEfforts, p);
    totalActualCost += (typeof cost === 'number' && !isNaN(cost) ? cost : 0);
  }

  return { totalEstimatedBudget, totalActualCost, totalEstimatedEffort, totalActualEffort };
}

// Helper: Calculate variance percentage with proper mathematical validation
function calculateVariance(actual: number, estimated: number): number {
  // Ensure both values are valid numbers
  if (typeof actual !== 'number' || typeof estimated !== 'number' || isNaN(actual) || isNaN(estimated)) {
    return 0;
  }
  
  // If estimated is zero or negative, handle edge cases
  if (estimated <= 0) {
    // If both are zero, no variance
    if (actual === 0) return 0;
    // If estimated is zero but actual is not, return 100% over (or under if negative)
    return actual > 0 ? 100 : -100;
  }
  
  // Standard variance calculation: ((actual - estimated) / estimated) * 100
  const variance = ((actual - estimated) / estimated) * 100;
  
  // Ensure the result is a valid number
  return isNaN(variance) ? 0 : variance;
}

// Helper: Calculate resource utilization based on actual project timeframes and effort data
async function calculateResourceUtilization(projectIds: string[]): Promise<number> {
  if (projectIds.length === 0) return 0;
  
  // Get all weekly effort records for the projects to calculate precise utilization
  const allEfforts = [];
  for (const projectId of projectIds) {
    const projectEfforts = await projectWeeklyEffortRepository.findAllByProject(projectId);
    allEfforts.push(...projectEfforts);
  }
  
  if (allEfforts.length === 0) return 0;
  
  // Group efforts by resource and week to get accurate weekly hour distribution
  const resourceWeeklyHours = new Map<string, Map<string, number>>();
  
  for (const effort of allEfforts) {
    const resourceId = effort.resource?._id?.toString() || 'unknown';
    const weekKey = effort.week_start_date.toISOString().split('T')[0];
    
    if (!resourceWeeklyHours.has(resourceId)) {
      resourceWeeklyHours.set(resourceId, new Map());
    }
    
    const resourceWeeks = resourceWeeklyHours.get(resourceId)!;
    resourceWeeks.set(weekKey, (resourceWeeks.get(weekKey) || 0) + effort.hours);
  }
  
  // Calculate utilization per resource based on their actual weekly patterns
  let totalUtilizationSum = 0;
  let resourceCount = 0;
  
  for (const [, weeklyHours] of resourceWeeklyHours) {
    if (weeklyHours.size === 0) continue;
    
    // Calculate average weekly hours for this resource
    const totalHours = Array.from(weeklyHours.values()).reduce((sum, hours) => sum + hours, 0);
    const avgWeeklyHours = totalHours / weeklyHours.size;
    
    // Calculate utilization based on actual peak capacity observed for this resource
    const maxWeeklyHours = Math.max(...Array.from(weeklyHours.values()));
    
    // If the resource has consistent hours, use max as capacity
    // If there's high variation, use statistical approach to determine realistic capacity
    const hoursArray = Array.from(weeklyHours.values());
    hoursArray.sort((a, b) => b - a); // Sort descending
    
    // Use 80th percentile as realistic capacity (removes outliers/overtime weeks)
    const percentile80Index = Math.floor(hoursArray.length * 0.2);
    const realisticCapacity = hoursArray.length > 2 ? hoursArray[percentile80Index] : maxWeeklyHours;
    
    // Calculate utilization as average vs realistic capacity (0-1 range)
    const utilization = realisticCapacity > 0 ? Math.min(avgWeeklyHours / realisticCapacity, 1) : 0;
    
    totalUtilizationSum += utilization;
    resourceCount++;
  }
  
  return resourceCount > 0 ? totalUtilizationSum / resourceCount : 0;
}

export async function getKPIs(userId?: string, projectId?: string) {
  let projects;
  
  if (projectId) {
    // Get specific project
    const project = await projectRepository.findById(projectId);
    projects = project ? [project] : [];
  } else {
    // Get all projects based on user role
    projects = userId ? await projectRepository.findByManager(userId) : await projectRepository.findAll();
  }

  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.project_status === ProjectStatus.COMPLETED).length;
  const onTimeProjects = countOnTimeProjects(projects);

  const projectIds = projects.map((p) => p._id.toString());
  const efforts = await Promise.all(projectIds.map((id) => projectWeeklyEffortRepository.findAllByProject(id)));

  const totals = await calculateBudgetAndEffortTotals(projects, efforts);
  const budgetVariance = calculateVariance(totals.totalActualCost, totals.totalEstimatedBudget);
  const scheduleVariance = calculateVariance(totals.totalActualEffort, totals.totalEstimatedEffort);

  const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
  const onTimeRate = completedProjects > 0 ? (onTimeProjects / completedProjects) * 100 : 0;
  const projectHealthScore = projects.length > 0
    ? (projects.filter((p) => p.overall_status === 'Green').length / projects.length) * 100
    : 0;

  const avgUtilization = await calculateResourceUtilization(projectIds);

  return {
    totalProjects,
    activeProjects: projects.filter((p) => p.project_status === ProjectStatus.ACTIVE).length,
    completedProjects,
    atRiskProjects: projects.filter((p) => p.overall_status === 'Red').length,
    projectHealthScore: Math.round(projectHealthScore * 10) / 10,
    budgetVariance: Math.round(budgetVariance * 10) / 10,
    scheduleVariance: Math.round(scheduleVariance * 10) / 10,
    resourceUtilization: Math.round(avgUtilization * 100 * 10) / 10,
    onTimeCompletionRate: Math.round(onTimeRate * 10) / 10,
    overallCompletionRate: Math.round(completionRate * 10) / 10,
  };
}

export async function getTrends(projectId?: string, userId?: string, timeRange: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  let projectIds: string[];
  if (projectId) {
    projectIds = [projectId];
  } else if (userId) {
    const projects = await projectRepository.findByManager(userId);
    projectIds = projects.map((p) => p._id.toString());
  } else {
    const projects = await projectRepository.findAll();
    projectIds = projects.map((p) => p._id.toString());
  }

  // Get detailed effort data for both total and breakdown - use single source of truth
  const detailedEfforts = await Promise.all(projectIds.map((id) => projectWeeklyEffortRepository.findAllByProject(id)));
  const allDetailedEfforts = detailedEfforts.flat().filter((e) => new Date(e.week_start_date) >= startDate);
  
  // Group by week for both totals and breakdown
  const effortByWeek = new Map<string, { hours: number; breakdown: Map<string, number> }>();
  
  for (const effort of allDetailedEfforts) {
    const weekKey = toISODateString(effort.week_start_date);
    const current = effortByWeek.get(weekKey) || { hours: 0, breakdown: new Map() };
    
    current.hours += effort.hours;
    
    if (projectId) {
      // For single project: show resource breakdown
      const resourceName = isPopulatedResource(effort.resource) 
        ? effort.resource.resource_name 
        : 'Unknown Resource';
      current.breakdown.set(resourceName, (current.breakdown.get(resourceName) || 0) + effort.hours);
    } else {
      // For all projects: show project breakdown
      const projectName = isPopulatedProject(effort.project) 
        ? effort.project.project_name 
        : 'Unknown Project';
      current.breakdown.set(projectName, (current.breakdown.get(projectName) || 0) + effort.hours);
    }
    
    effortByWeek.set(weekKey, current);
  }
  
  // Convert to array and sort by date
  const effortTrend = Array.from(effortByWeek.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, data]) => ({
      date,
      hours: data.hours,
      breakdown: Object.fromEntries(data.breakdown),
    }));

  // Budget burn-down - fetch projects to get hourly rate configuration
  const projectsData = await Promise.all(projectIds.map((id) => projectRepository.findByIdWithPopulate(id)));
  const projectsMap = new Map(projectsData.filter(p => p).map(p => [p!._id.toString(), p!]));
  
  const efforts = await Promise.all(projectIds.map((id) => projectWeeklyEffortRepository.findAllByProject(id)));
  const allEfforts = efforts.flat().filter((e) => new Date(e.week_start_date) >= startDate);

  allEfforts.sort((a, b) => new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime());

  let cumulativeCost = 0;
  const budgetTrend = allEfforts.map((e) => {
    const effortProject = isPopulatedProject(e.project) ? e.project : undefined;
    const projectDoc = effortProject ? projectsMap.get(effortProject._id.toString()) : undefined;
    if (projectDoc) {
      const resource = isPopulatedResource(e.resource) ? e.resource : undefined;
      const hourlyRate = getHourlyRate(projectDoc, resource);
      cumulativeCost += e.hours * hourlyRate;
    }
    return {
      date: toISODateString(e.week_start_date),
      cost: cumulativeCost,
    };
  });

  // Scope completion trend - fetch from weekly metrics
  const metricsPromises = projectIds.map((id) => 
    projectWeeklyMetricsRepository.findByProject(id, { page: 1, limit: 1000, sort: 'week_start_date', order: 'asc' })
  );
  const allMetricsResults = await Promise.all(metricsPromises);
  const allMetrics = allMetricsResults.flatMap(result => result.data)
    .filter((m) => new Date(m.week_start_date) >= startDate)
    .sort((a, b) => new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime());
  
  const scopeTrend = allMetrics.map((m) => ({
    date: toISODateString(m.week_start_date),
    scope_completed: m.scope_completed || 0,
    project: isPopulatedProject(m.project) ? m.project.project_name : 'Unknown',
    comments: m.comments || '',
  }));

  return {
    effortTrend,
    budgetTrend,
    scopeTrend,
  };
}

export async function getProjectsList(userId?: string) {
  const projects = userId ? await projectRepository.findByManager(userId) : await projectRepository.findAll();
  
  return projects.map(project => ({
    _id: project._id,
    project_name: project.project_name,
    customer: project.customer
  }));
}
