import { z } from 'zod';

export const createWeeklyEffortSchema = z.object({
  project: z.string().min(1, 'Project is required'),
  resource: z.string().min(1, 'Resource is required'),
  hours: z.number().min(0, 'Hours cannot be negative').max(168, 'Hours cannot exceed 168 (hours in a week)'),
  week_start_date: z.coerce.date(),
  week_end_date: z.coerce.date(),
}).refine((data) => data.week_end_date > data.week_start_date, {
  message: 'Week end date must be after week start date',
  path: ['week_end_date'],
});

export const updateWeeklyEffortSchema = z.object({
  hours: z.number().min(0, 'Hours cannot be negative').max(168, 'Hours cannot exceed 168 (hours in a week)').optional(),
});

export const weeklyEffortQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(10),
  project: z.string().optional(),
  resource: z.string().optional(),
  week_start_date: z.string().optional(),
  sort: z.enum(['week_start_date', 'hours', 'createdAt', 'last_modified_date']).optional().default('week_start_date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const bulkWeeklyEffortSchema = z.object({
  entries: z.array(
    z.object({
      project: z.string().min(1, 'Project is required'),
      resource: z.string().min(1, 'Resource is required'),
      hours: z.number().min(0).max(168),
      week_start_date: z.coerce.date(),
      week_end_date: z.coerce.date(),
    }).refine((data) => data.week_end_date > data.week_start_date, {
      message: 'Week end date must be after week start date',
    })
  ).min(1, 'At least one entry is required'),
});

export type CreateWeeklyEffortInput = z.infer<typeof createWeeklyEffortSchema>;
export type UpdateWeeklyEffortInput = z.infer<typeof updateWeeklyEffortSchema>;
export type BulkWeeklyEffortInput = z.infer<typeof bulkWeeklyEffortSchema>;
