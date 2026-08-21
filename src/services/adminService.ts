import { api } from '../lib/api/client';
import type {
  AdminCustomer,
  AdminCustomerFilters,
  AdminDashboardStats,
  AdminInventoryFilters,
  AdminInventoryItem,
  AdminOrder,
  AdminOrderFilters,
  AdminOrderStatus,
  AdminPage,
  AdminPayment,
  AdminPaymentFilters,
  AdminProduct,
  AdminProductFilters,
  AuditLogEntry,
  AuditLogFilters,
} from '../types/admin';

/**
 * Admin API service — every call hits an /admin/* endpoint that the server
 * protects with session auth + the admin role. The UI never assumes access;
 * a non-admin simply receives 403s from these calls.
 */

function toQuery(params: Record<string, unknown> | object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Fields the admin product endpoints accept for create/update. */
export interface AdminProductPatch {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  categoryId?: string;
  brandId?: number;
  ageGroup?: 'kids' | 'teens' | 'adults';
  ageRange?: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
  stockQuantity?: number;
  isActive?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export function fetchDashboardStats(): Promise<AdminDashboardStats> {
  return api.get<AdminDashboardStats>('/admin/dashboard');
}

// ── Products ───────────────────────────────────────────────────────────────

export function listAdminProducts(filters: AdminProductFilters = {}): Promise<AdminPage<AdminProduct>> {
  return api.get<AdminPage<AdminProduct>>(`/admin/products${toQuery(filters)}`);
}

export function getAdminProduct(id: number): Promise<AdminProduct> {
  return api.get<AdminProduct>(`/admin/products/${id}`);
}

export function updateAdminProduct(id: number, patch: AdminProductPatch): Promise<AdminProduct> {
  return api.patch<AdminProduct>(`/admin/products/${id}`, patch);
}

/** Soft delete — the server deactivates the product. */
export function deleteAdminProduct(id: number): Promise<void> {
  return api.delete<{ message: string }>(`/admin/products/${id}`).then(() => undefined);
}

// ── Inventory ──────────────────────────────────────────────────────────────

export function listAdminInventory(filters: AdminInventoryFilters = {}): Promise<AdminPage<AdminInventoryItem>> {
  return api.get<AdminPage<AdminInventoryItem>>(`/admin/inventory${toQuery(filters)}`);
}

export interface InventoryAdjustmentPayload {
  quantityDelta: number;
  reason: string;
  referenceType?: 'order' | 'adjustment' | 'purchase' | 'other';
  referenceId?: string;
}

export function adjustInventory(productId: number, payload: InventoryAdjustmentPayload): Promise<{
  productId: number;
  productName: string;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
}> {
  return api.post(`/admin/inventory/${productId}/adjust`, payload);
}

// ── Orders ─────────────────────────────────────────────────────────────────

export function listAdminOrders(filters: AdminOrderFilters = {}): Promise<AdminPage<AdminOrder>> {
  return api.get<AdminPage<AdminOrder>>(`/admin/orders${toQuery(filters)}`);
}

export function getAdminOrder(orderNumber: string): Promise<AdminOrder> {
  return api.get<AdminOrder>(`/admin/orders/${orderNumber}`);
}

export function updateAdminOrderStatus(orderNumber: string, status: AdminOrderStatus): Promise<void> {
  return api.patch<{ message: string }>(`/admin/orders/${orderNumber}/status`, { status }).then(() => undefined);
}

// ── Customers ──────────────────────────────────────────────────────────────

export function listAdminCustomers(filters: AdminCustomerFilters = {}): Promise<AdminPage<AdminCustomer>> {
  return api.get<AdminPage<AdminCustomer>>(`/admin/customers${toQuery(filters)}`);
}

export function getAdminCustomer(id: number): Promise<AdminCustomer> {
  return api.get<AdminCustomer>(`/admin/customers/${id}`);
}

export function updateAdminCustomerStatus(id: number, status: 'active' | 'suspended'): Promise<void> {
  return api.patch<{ message: string }>(`/admin/customers/${id}/status`, { status }).then(() => undefined);
}

// ── Payments ───────────────────────────────────────────────────────────────

export function listAdminPayments(filters: AdminPaymentFilters = {}): Promise<AdminPage<AdminPayment>> {
  return api.get<AdminPage<AdminPayment>>(`/admin/payments${toQuery(filters)}`);
}

// ── Audit logs ─────────────────────────────────────────────────────────────

export function listAuditLogs(filters: AuditLogFilters = {}): Promise<AdminPage<AuditLogEntry>> {
  return api.get<AdminPage<AuditLogEntry>>(`/admin/audit-logs${toQuery(filters)}`);
}
