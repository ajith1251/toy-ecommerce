import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const nameField = z.string().trim().min(1, 'Required').max(80);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameField,
  lastName: nameField,
  phone: z.string().trim().max(30).optional().default(''),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export interface MergeCartItem {
  productId: number;
  quantity: number;
}

/** Guest cart/wishlist supplied by the client for the anonymous → account merge. */
export const mergeSchema = z.object({
  cartItems: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(99),
      })
    )
    .max(50)
    .optional()
    .default([]),
  wishlistIds: z.array(z.coerce.number().int().positive()).max(200).optional().default([]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(256),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
  phone: z.string().trim().max(30).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Provide at least one field to update' });

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().default(''),
  firstName: nameField.optional().default(''),
  lastName: nameField.optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  line1: z.string().trim().min(1, 'Street address is required').max(160),
  line2: z.string().trim().max(160).optional().default(''),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().max(80).optional().default(''),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(80).optional().default(''),
});

export const addressIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MergeInput = z.infer<typeof mergeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
