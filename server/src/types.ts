export type AgeGroup = 'kids' | 'teens' | 'adults';

export type PaymentMethod = 'card' | 'upi' | 'cod';

export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'refunded';

/** API product shape — matches the frontend `Toy` type plus stockQuantity. */
export interface ProductDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  category: string; // category slug
  brand: string; // brand name
  ageGroup: AgeGroup;
  ageRange: string;
  rating: number;
  reviewCount: number;
  image: string;
  stockQuantity: number;
  inStock: boolean;
  isNew: boolean;
  isBestseller: boolean;
}

export interface CategoryDto {
  id: string; // slug
  name: string;
  icon: string;
  color: string;
  ageGroup: AgeGroup;
  slug: string;
}

export interface BrandDto {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface OrderCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface OrderShippingAddressDto {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Safe payment snapshot — never contains CVV or the full card number. */
export interface OrderPaymentDto {
  method: PaymentMethod;
  last4?: string;
  upiId?: string;
}

export interface OrderItemDto {
  id: number; // product id
  name: string;
  image: string;
  brand: string;
  price: number;
  quantity: number;
}

export interface OrderPricingDto {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  grandTotal: number;
}

export interface OrderDto {
  id: string; // order number (TBX-…)
  createdAt: string;
  status: OrderStatus;
  customer: OrderCustomerDto;
  shippingAddress: OrderShippingAddressDto;
  payment: OrderPaymentDto;
  paymentStatus: PaymentStatus;
  items: OrderItemDto[];
  pricing: OrderPricingDto;
}

export interface CartItemDto {
  productId: number;
  quantity: number;
  product: ProductDto;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── Accounts ─────────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'suspended';

/** Safe user shape returned by auth/profile endpoints — never the password hash. */
export interface UserDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
  role: 'customer' | 'admin';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AddressDto {
  id: number;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

/** A valid session bound to a user (resolved from the cookie token). */
export interface SessionUser {
  sessionId: number;
  userId: number;
}
