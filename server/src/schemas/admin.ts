import { z } from 'zod';

/** Numeric entity id path parameter (products, users, payments…). */
export const numericIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Order number path parameter (TBX-…). */
export const orderNumberParamsSchema = z.object({
  id: z.string().min(3).max(40),
});

/** Category slug path parameter. */
export const categoryIdParamsSchema = z.object({
  id: z.string().min(1).max(100),
});

/** Admin order status update — mirrors the DB CHECK constraint. */
export const orderStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled']),
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

/** Admin customer activation toggle — text status per the users table. */
export const customerStatusUpdateSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export type CustomerStatusUpdateInput = z.infer<typeof customerStatusUpdateSchema>;

/** Shared pagination query for admin list endpoints. */
export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AdminPagination = z.infer<typeof adminPaginationSchema>;
