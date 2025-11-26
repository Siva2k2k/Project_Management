import { z } from 'zod';
import { ProjectType, RAGStatus, ProjectTrackingBy, ProjectStatus, HourlyRateSource } from '../types';

const milestoneSchema = z.object({
  description: z.string().trim().min(1, 'Milestone description is required'),
  estimated_date: z.coerce.date(),
  estimated_effort: z.number().min(0, 'Estimated effort cannot be negative'),
  scope_completed: z.number().default(0),
  completed_date: z.coerce.date().optional().nullable(),
});

export const createProjectSchema = z.object({
  project_name: z.string().trim().min(1, 'Project name is required').max(200, 'Project name cannot exceed 200 characters'),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  project_type: z.nativeEnum(ProjectType),
  estimated_effort: z.coerce.number().min(0, 'Estimated effort cannot be negative'),
  estimated_budget: z.coerce.number().min(0, 'Estimated budget cannot be negative'),
  estimated_resources: z.coerce.number().min(0, 'Estimated resources cannot be negative'),
  scope_completed: z.coerce.number().default(0),
  milestones: z.array(milestoneSchema).default([]),
  overall_status: z.nativeEnum(RAGStatus).default(RAGStatus.GREEN),
  assigned_manager: z.string().min(1, 'Assigned manager is required'),
  tracking_by: z.nativeEnum(ProjectTrackingBy).default(ProjectTrackingBy.ENDDATE),
  scope_status: z.nativeEnum(RAGStatus).default(RAGStatus.GREEN),
  quality_status: z.nativeEnum(RAGStatus).default(RAGStatus.GREEN),
  budget_status: z.nativeEnum(RAGStatus).default(RAGStatus.GREEN),
  customer: z.string().min(1, 'Customer is required'),
  project_status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE),
  hourly_rate: z.preprocess(
    (val) => {
      // Handle null, undefined, empty string, or NaN
      if (val === null || val === '' || val === undefined) return undefined;
      if (typeof val === 'number' && isNaN(val)) return undefined;
      return val;
    },
    z.coerce.number().min(0, 'Hourly rate cannot be negative').optional()
  ),
  hourly_rate_source: z.nativeEnum(HourlyRateSource).default(HourlyRateSource.RESOURCE),
}).refine((data) => data.end_date > data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export const updateProjectSchema = z.object({
  project_name: z.string().trim().max(200, 'Project name cannot exceed 200 characters').optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  project_type: z.nativeEnum(ProjectType).optional(),
  estimated_effort: z.coerce.number().min(0, 'Estimated effort cannot be negative').optional(),
  estimated_budget: z.coerce.number().min(0, 'Estimated budget cannot be negative').optional(),
  estimated_resources: z.coerce.number().min(0, 'Estimated resources cannot be negative').optional(),
  scope_completed: z.coerce.number().optional(),
  milestones: z.array(milestoneSchema).optional(),
  overall_status: z.nativeEnum(RAGStatus).optional(),
  assigned_manager: z.string().optional(),
  tracking_by: z.nativeEnum(ProjectTrackingBy).optional(),
  scope_status: z.nativeEnum(RAGStatus).optional(),
  quality_status: z.nativeEnum(RAGStatus).optional(),
  budget_status: z.nativeEnum(RAGStatus).optional(),
  customer: z.string().optional(),
  project_status: z.nativeEnum(ProjectStatus).optional(),
  hourly_rate: z.coerce.number().min(0, 'Hourly rate cannot be negative').optional(),
  hourly_rate_source: z.nativeEnum(HourlyRateSource).optional(),
});

export const addMilestoneSchema = z.object({
  description: z.string().trim().min(1, 'Milestone description is required'),
  estimated_date: z.coerce.date(),
  estimated_effort: z.number().min(0, 'Estimated effort cannot be negative'),
});

export const updateMilestoneSchema = z.object({
  scope_completed: z.number().optional(),
  completed_date: z.coerce.date().optional().nullable(),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  assigned_manager: z.string().optional(),
  customer: z.string().optional(),
  overall_status: z.nativeEnum(RAGStatus).optional(),
  project_type: z.nativeEnum(ProjectType).optional(),
  sort: z.enum(['project_name', 'start_date', 'end_date', 'overall_status', 'createdAt', 'last_modified_date']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMilestoneInput = z.infer<typeof addMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
