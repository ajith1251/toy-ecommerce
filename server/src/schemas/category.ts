import { z } from 'zod';

export const createCategorySchema = z.object({
  id: z.string().min(1, 'Category ID (slug) is required').regex(/^[a-z0-9-]+$/, 'Category ID must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().min(1, 'Color is required'),
  ageGroup: z.enum(['kids', 'teens', 'adults'], 'Age group must be kids, teens, or adults'),
  description: z.string().min(1, 'Description is required'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  icon: z.string().min(1, 'Icon is required').optional(),
  color: z.string().min(1, 'Color is required').optional(),
  ageGroup: z.enum(['kids', 'teens', 'adults'], 'Age group must be kids, teens, or adults').optional(),
  description: z.string().min(1, 'Description is required').optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;