import { z } from 'zod';
import { ResourceStatus, Currency } from '../types';

export const createResourceSchema = z.object({
  resource_name: z.string().trim().max(100, 'Resource name cannot exceed 100 characters'),
  email: z.string().email('Please enter a valid email').toLowerCase().trim(),
  status: z.nativeEnum(ResourceStatus).default(ResourceStatus.ACTIVE),
  per_hour_rate: z.number().min(0, 'Per hour rate cannot be negative'),
  currency: z.nativeEnum(Currency).default(Currency.USD),
});

export const updateResourceSchema = z.object({
  resource_name: z.string().trim().max(100, 'Resource name cannot exceed 100 characters').optional(),
  email: z.string().email('Please enter a valid email').toLowerCase().trim().optional(),
  status: z.nativeEnum(ResourceStatus).optional(),
  per_hour_rate: z.number().min(0, 'Per hour rate cannot be negative').optional(),
  currency: z.nativeEnum(Currency).optional(),
});

export const updateResourceStatusSchema = z.object({
  status: z.nativeEnum(ResourceStatus),
});

export const resourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(ResourceStatus).optional(),
  currency: z.nativeEnum(Currency).optional(),
  sort: z.enum(['resource_name', 'email', 'status', 'per_hour_rate', 'createdAt', 'last_modified_date']).optional().default('resource_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type UpdateResourceStatusInput = z.infer<typeof updateResourceStatusSchema>;
