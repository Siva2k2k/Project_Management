import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[A-Za-z]/, 'Name must start with a letter')
    .regex(/[A-Za-z]/, 'Name must contain at least one letter')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['Manager', 'Admin', 'CEO']),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['Manager', 'Admin', 'CEO']).optional(),
  is_active: z.coerce.boolean().optional(),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const bulkImportSchema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      password: z.string().min(8).optional(),
      role: z.enum(['Manager', 'Admin', 'CEO']).optional(),
    })
  ).min(1, 'At least one user is required'),
});

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[A-Za-z]/, 'Name must start with a letter')
    .regex(/[A-Za-z]/, 'Name must contain at least one letter')
    .trim(),
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Manager', 'Admin', 'CEO']),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
