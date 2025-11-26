import { z } from 'zod';

export const createWeeklyMetricsSchema = z.object({
  project: z.string().min(1, 'Project is required'),
  week_start_date: z.coerce.date(),
  week_end_date: z.coerce.date(),
  rollup_hours: z.number().min(0, 'Rollup hours cannot be negative'),
  scope_completed: z.number(),
  comments: z.string().trim().optional(),
}).refine((data) => data.week_end_date > data.week_start_date, {
  message: 'Week end date must be after week start date',
  path: ['week_end_date'],
});

export const updateWeeklyMetricsSchema = z.object({
  rollup_hours: z.number().min(0, 'Rollup hours cannot be negative').optional(),
  scope_completed: z.number().optional(),
  comments: z.string().trim().optional(),
});

export const weeklyMetricsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(10),
  project: z.string().optional(),
  week_start_date: z.string().optional(),
  sort: z.enum(['week_start_date', 'scope_completed', 'rollup_hours', 'createdAt', 'last_modified_date']).optional().default('week_start_date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateWeeklyMetricsInput = z.infer<typeof createWeeklyMetricsSchema>;
export type UpdateWeeklyMetricsInput = z.infer<typeof updateWeeklyMetricsSchema>;
