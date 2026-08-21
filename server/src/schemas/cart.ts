import { z } from 'zod';

export const addCartItemSchema = z
  .object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(99).default(1),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(0).max(99, 'quantity cannot exceed 99'),
  })
  .strict();

export const productIdParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
