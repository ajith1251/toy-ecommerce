import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  originalPrice: z.coerce.number().min(0, 'Original price must be greater than or equal to 0').optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.coerce.number().int().positive('Brand must be selected'),
  ageGroup: z.enum(['kids', 'teens', 'adults'], 'Age group must be kids, teens, or adults'),
  ageRange: z.string().min(1, 'Age range is required'),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  reviewCount: z.coerce.number().int().min(0).optional().default(0),
  image: z.string().url('Image must be a valid URL').optional(),
  stockQuantity: z.coerce.number().int().min(0, 'Stock quantity must be greater than or equal to 0').optional().default(0),
  isActive: z.boolean().optional().default(true),
  isNew: z.boolean().optional().default(false),
  isBestseller: z.boolean().optional().default(false),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).optional(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0').optional(),
  originalPrice: z.coerce.number().min(0, 'Original price must be greater than or equal to 0').optional().nullable(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  brandId: z.coerce.number().int().positive('Brand must be selected').optional(),
  ageGroup: z.enum(['kids', 'teens', 'adults'], 'Age group must be kids, teens, or adults').optional(),
  ageRange: z.string().min(1, 'Age range is required').optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
  image: z.string().url('Image must be a valid URL').optional(),
  stockQuantity: z.coerce.number().int().min(0, 'Stock quantity must be greater than or equal to 0').optional(),
  isActive: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;