import { z } from 'zod';

/** Anonymous browser identifier — a UUID generated client-side. Not auth. */
export const clientIdSchema = z
  .string()
  .min(8, 'client id must be at least 8 characters')
  .max(128, 'client id is too long')
  .regex(/^[A-Za-z0-9-]+$/, 'client id contains invalid characters');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(24),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

const SORT_OPTIONS = ['newest', 'price-asc', 'price-desc', 'rating', 'bestseller'] as const;
export const sortOptionSchema = z.enum(SORT_OPTIONS);

export const productQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  sort: sortOptionSchema.default('newest'),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
