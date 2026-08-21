import type pg from 'pg';
import type { DbPool } from '../db/pool.js';
import type {
  OrderCustomerDto,
  OrderDto,
  OrderItemDto,
  OrderPaymentDto,
  OrderPricingDto,
  OrderShippingAddressDto,
  OrderStatus,
  PaymentStatus,
} from '../types.js';

/** Anything that can run parameterized queries (pool or a transaction client). */
type Queryable = DbPool | pg.PoolClient;

interface OrderRow {
  order_number: string;
  status: OrderStatus;
  customer: OrderCustomerDto;
  shipping_address: OrderShippingAddressDto;
  payment: OrderPaymentDto;
  pricing: OrderPricingDto;
  created_at: string;
  payment_status: PaymentStatus;
}

interface OrderItemRow {
  product_id: number;
  product_name: string;
  image: string;
  brand: string;
  unit_price: string;
  quantity: number;
}

export interface NewOrderRecord {
  orderNumber: string;
  clientId: string;
  /** Owner of the order — null for anonymous guests. */
  userId: number | null;
  customer: OrderCustomerDto;
  shippingAddress: OrderShippingAddressDto;
  payment: OrderPaymentDto;
  pricing: OrderPricingDto;
  items: OrderItemDto[];
}

/** Scopes order queries to one owner (authenticated user or anonymous client). */
export type OrderScope = { userId: number } | { clientId: string };

function scopeWhere(scope: OrderScope, paramIndex: number): string {
  // Claimed (user-owned) orders leave the anonymous client scope entirely.
  return 'userId' in scope ? `user_id = $${paramIndex}` : `client_id = $${paramIndex} AND user_id IS NULL`;
}

function mapOrder(row: OrderRow, items: OrderItemDto[]): OrderDto {
  return {
    id: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    customer: row.customer,
    shippingAddress: row.shipping_address,
    payment: row.payment,
    paymentStatus: row.payment_status,
    pricing: row.pricing,
    items,
  };
}

export function createOrderRepository(pool: DbPool) {
  /** Inserts the order + items inside the caller's transaction. Returns the created order. */
async function insertOrder(q: Queryable, record: NewOrderRecord): Promise<OrderDto> {
  const orderRes = await q.query<OrderRow>(
    `INSERT INTO orders (order_number, client_id, user_id, status, customer, shipping_address, payment, pricing, payment_status)
     VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7, 'pending')
     RETURNING order_number, status, customer, shipping_address, payment, pricing, created_at, payment_status`,
    [
      record.orderNumber,
      record.clientId,
      record.userId,
      JSON.stringify(record.customer),
      JSON.stringify(record.shippingAddress),
      JSON.stringify(record.payment),
      JSON.stringify(record.pricing),
    ]
  );
    const order = orderRes.rows[0];
    if (!order) throw new Error('Order insert returned no row');

    for (const item of record.items) {
      await q.query(
        `INSERT INTO order_items (order_id, product_id, product_name, brand, image, unit_price, quantity, line_total)
         SELECT id, $2, $3, $4, $5, $6::numeric, $7::int, round(($6::numeric * $7::int), 2)
         FROM orders WHERE order_number = $1`,
        [record.orderNumber, item.id, item.name, item.brand, item.image, item.price, item.quantity]
      );
    }

    return mapOrder(order, record.items);
  }

  async function listOrders(scope: OrderScope): Promise<OrderDto[]> {
    const orders = await pool.query<OrderRow>(
      `SELECT order_number, status, customer, shipping_address, payment, pricing, created_at
       FROM orders WHERE ${scopeWhere(scope, 1)} ORDER BY created_at DESC`,
      ['userId' in scope ? scope.userId : scope.clientId]
    );
    return Promise.all(orders.rows.map(async row => mapOrder(row, await loadItems(row.order_number))));
  }

  async function getOrderByNumber(orderNumber: string, scope: OrderScope | null): Promise<OrderDto | null> {
    const where = scope
      ? `WHERE order_number = $1 AND ${scopeWhere(scope, 2)}`
      : 'WHERE order_number = $1';
    const params = scope ? [orderNumber, 'userId' in scope ? scope.userId : scope.clientId] : [orderNumber];
    const res = await pool.query<OrderRow>(
      `SELECT order_number, status, customer, shipping_address, payment, pricing, created_at
       FROM orders ${where}`,
      params
    );
    const row = res.rows[0];
    if (!row) return null;
    return mapOrder(row, await loadItems(row.order_number));
  }

  /** Claims anonymous orders made from the same browser (client id) for an account. */
  async function claimOrdersForUser(clientId: string, userId: number): Promise<number> {
    const res = await pool.query(
      `UPDATE orders SET user_id = $2, updated_at = now()
       WHERE client_id = $1 AND user_id IS NULL`,
      [clientId, userId]
    );
    return res.rowCount ?? 0;
  }

  /** Updates the payment status of an order. */
  async function updatePaymentStatus(orderNumber: string, paymentStatus: PaymentStatus): Promise<void> {
    await pool.query(
      `UPDATE orders SET payment_status = $1, updated_at = now() WHERE order_number = $2`,
      [paymentStatus, orderNumber]
    );
  }

/** Updates the order status (e.g., confirmed -> paid). */
   async function updateOrderStatus(q: Queryable, orderNumber: string, status: OrderStatus): Promise<void> {
     await q.query(
       `UPDATE orders SET status = $1, updated_at = now() WHERE order_number = $2`,
       [status, orderNumber]
     );
   }

  /** Gets the internal order ID (bigint) by order number. */
  async function getOrderIdByNumber(orderNumber: string): Promise<bigint | null> {
    const res = await pool.query<{ id: bigint }>(
      `SELECT id FROM orders WHERE order_number = $1`,
      [orderNumber]
    );
    return res.rows[0]?.id ?? null;
  }

  async function loadItems(orderNumber: string): Promise<OrderItemDto[]> {
    const res = await pool.query<OrderItemRow>(
      `SELECT product_id, product_name, image, brand, unit_price, quantity
       FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)
       ORDER BY id`,
      [orderNumber]
    );
    return res.rows.map(r => ({
      id: r.product_id,
      name: r.product_name,
      image: r.image,
      brand: r.brand,
      price: Number(r.unit_price),
      quantity: r.quantity,
    }));
  }

  return { insertOrder, listOrders, getOrderByNumber, claimOrdersForUser, getOrderIdByNumber, updatePaymentStatus, updateOrderStatus };
}

export type OrderRepository = ReturnType<typeof createOrderRepository>;
