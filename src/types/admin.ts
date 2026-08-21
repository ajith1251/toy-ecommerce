import type { AgeGroup } from './index';

/** Shared paginated list envelope returned by admin list endpoints. */
export interface AdminPage<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminDashboardStats {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  lowStock: number;
  pendingPayments: number;
}

/** Admin product row — includes fields hidden from the storefront. */
export interface AdminProduct {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  category: string;
  brand: string;
  ageGroup: AgeGroup;
  ageRange: string;
  rating: number;
  reviewCount: number;
  image: string;
  stockQuantity: number;
  inStock: boolean;
  isNew: boolean;
  isBestseller: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | '';
}

export interface AdminOrderItem {
  product_id: number;
  product_name: string;
  image: string;
  brand: string;
  unit_price: number | string;
  quantity: number;
}

export interface AdminOrder {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  paymentStatus: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  shippingAddress?: Record<string, string>;
  payment?: Record<string, unknown>;
  pricing?: { subtotal: number; discount: number; shipping: number; tax: number; grandTotal: number };
  items: AdminOrderItem[];
}

export interface AdminOrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  customer?: string;
}

export type AdminOrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface AdminInventoryItem {
  id: number;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  stockQuantity: number;
  brand: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminInventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  stock?: 'in-stock' | 'low-stock' | 'out-of-stock' | '';
}

export interface AdminCustomer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
  status: 'active' | 'suspended';
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminCustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | '';
}

export interface AdminPayment {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  method: string;
  amount: number;
  currency: string;
  status: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt?: string;
  capturedAt: string | null;
  customer?: { firstName: string; lastName: string; email: string };
}

export interface AdminPaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
  customer?: string;
}

export interface AuditLogEntry {
  id: number;
  adminUserId: number | null;
  adminEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  adminUserId?: number;
}
