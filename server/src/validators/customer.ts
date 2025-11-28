import { z } from 'zod';

export const createCustomerSchema = z.object({
  customer_name: z.string().trim().max(200, 'Customer name cannot exceed 200 characters')
    .regex(/^[A-Za-z]/, 'Customer name must start with a letter')
    .regex(/[A-Za-z]/, 'Customer name must contain at least one letter'),
  email: z.string().email('Please enter a valid email').toLowerCase().trim(),
  contact_info: z.string().trim().max(500, 'Contact info cannot exceed 500 characters').optional(),
});

export const updateCustomerSchema = z.object({
  customer_name: z.string().trim().max(200, 'Customer name cannot exceed 200 characters')
    .regex(/^[A-Za-z]/, 'Customer name must start with a letter')
    .regex(/[A-Za-z]/, 'Customer name must contain at least one letter').optional(),
  email: z.string().email('Please enter a valid email').toLowerCase().trim().optional(),
  contact_info: z.string().trim().max(500, 'Contact info cannot exceed 500 characters').optional(),
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  sort: z.enum(['customer_name', 'email', 'createdAt', 'last_modified_date']).optional().default('customer_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
