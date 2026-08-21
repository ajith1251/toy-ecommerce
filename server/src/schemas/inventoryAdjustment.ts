import { z } from 'zod';

export const inventoryAdjustmentSchema = z.object({
  quantityDelta: z.number().int('Quantity change must be an integer'),
  reason: z.string().min(1, 'Reason is required').max(255),
  referenceType: z.enum(['order', 'adjustment', 'purchase', 'other'], 'Reference type must be order, adjustment, purchase, or other').optional(),
  referenceId: z.string().max(100).optional(),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;