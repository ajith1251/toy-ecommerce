import { z } from 'zod';

const MAX_ITEM_QUANTITY = 99;

export const orderItemSchema = z.object({
  productId: z.number().int().positive('product id must be a positive integer'),
  quantity: z.number().int().min(1, 'quantity must be at least 1').max(MAX_ITEM_QUANTITY, `quantity cannot exceed ${MAX_ITEM_QUANTITY}`),
});

export const shippingSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.email('Enter a valid email address').max(200),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(30),
  line1: z.string().trim().min(1, 'Address is required').max(200),
  line2: z.string().trim().max(200).default(''),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(100),
});

/**
 * Safe payment snapshot submitted by the client. The frontend never sends
 * the full card number or CVV — only display data (method, last4, upiId).
 */
export const paymentSchema = z.discriminatedUnion('method', [
  z
    .object({
      method: z.literal('card'),
      last4: z.string().regex(/^\d{4}$/, 'last4 must be exactly 4 digits'),
      cardName: z.string().trim().max(200).optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal('upi'),
      upiId: z.string().trim().min(3, 'UPI ID is required').max(200),
    })
    .strict(),
  z
    .object({
      method: z.literal('cod'),
    })
    .strict(),
]);

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1, 'Order must contain at least one item').max(50),
    shipping: shippingSchema,
    payment: paymentSchema,
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
