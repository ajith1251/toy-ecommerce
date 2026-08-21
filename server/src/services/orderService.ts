import type { DbPool } from '../db/pool.js';
import { ConflictError, InsufficientStockError, NotFoundError } from '../errors.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { OrderRepository } from '../repositories/orderRepository.js';
import type { CreateOrderInput } from '../schemas/order.js';
import type { OrderDto, OrderItemDto, OrderPaymentDto, OrderStatus } from '../types.js';
import { generateOrderNumber } from '../utils/ids.js';
import { calcServerTotals, roundMoney } from '../utils/pricing.js';
import type { OrderScope } from '../repositories/orderRepository.js';
import { isValidOrderTransition } from '../utils/orderStatus.js';

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

export interface CreateOrderDeps {
  pool: DbPool;
  productRepo: ProductRepository;
  orderRepo: OrderRepository;
}

/** The validated order payload plus server-derived ownership. */
export type CreateOrderParams = CreateOrderInput & { clientId: string; userId: number | null };

export function createOrderService({ pool, productRepo, orderRepo }: CreateOrderDeps) {
  /**
   * Validates, prices, and persists an order atomically:
   *   1. Lock the requested products (SELECT … FOR UPDATE)
   *   2. Validate existence / activity / stock against current DB state
   *   3. Calculate totals from current server prices
   *   4. Insert order + items, decrement stock
   *   5. COMMIT (or ROLLBACK on any failure)
   *
   * Client-supplied totals, prices and discounts are never trusted.
   */
  async function createOrder(input: CreateOrderParams): Promise<OrderDto> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Merge duplicate product lines (defensive — the client already dedupes).
      const merged = new Map<number, number>();
      for (const item of input.items) {
        merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
      }
      const ids = Array.from(merged.keys());

      // Lock product rows so concurrent checkouts cannot oversell stock.
      const locked = await client.query<
        { id: number; name: string; image: string; brand_name: string; price: string; stock_quantity: number; is_active: boolean }
      >(
        `SELECT p.id, p.name, p.image, b.name AS brand_name, p.price, p.stock_quantity, p.is_active
         FROM products p JOIN brands b ON b.id = p.brand_id
         WHERE p.id = ANY($1::int[]) FOR UPDATE`,
        [ids]
      );
      const byId = new Map(locked.rows.map(r => [r.id, r]));

      for (const productId of ids) {
        const row = byId.get(productId);
        if (!row || !row.is_active) {
          throw new NotFoundError(`Product ${productId} not found`);
        }
        const requested = merged.get(productId) ?? 0;
        if (requested > row.stock_quantity) {
          throw new InsufficientStockError({
            productId,
            requested,
            available: row.stock_quantity,
          });
        }
      }

      // Server-side pricing from current DB prices.
      const items: OrderItemDto[] = ids.map(productId => {
        const row = byId.get(productId);
        if (!row) throw new ConflictError(`Product ${productId} is unavailable`);
        return {
          id: productId,
          name: row.name,
          image: row.image,
          brand: row.brand_name,
          price: Number(row.price),
          quantity: merged.get(productId) ?? 0,
        };
      });
      const pricing = calcServerTotals(items.map(i => ({ unitPrice: i.price, quantity: i.quantity })));

      const payment = toSafePayment(input.payment);

      // Insert with a unique order number, retrying on the (extremely rare)
      // random collision so a number is never reused.
      let order: OrderDto | null = null;
      for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS && !order; attempt++) {
        const orderNumber = generateOrderNumber();
        try {
          order = await orderRepo.insertOrder(client, {
            orderNumber,
            clientId: input.clientId,
            userId: input.userId,
            customer: {
              firstName: input.shipping.firstName,
              lastName: input.shipping.lastName,
              email: input.shipping.email,
              phone: input.shipping.phone,
            },
            shippingAddress: {
              line1: input.shipping.line1,
              line2: input.shipping.line2,
              city: input.shipping.city,
              state: input.shipping.state,
              postalCode: input.shipping.postalCode,
              country: input.shipping.country,
            },
            payment,
            pricing,
            items,
          });
        } catch (err) {
          if (isUniqueViolation(err)) continue; // collision — regenerate
          throw err;
        }
      }
      if (!order) {
        throw new ConflictError('Could not allocate a unique order number — please retry');
      }

      // Decrement stock atomically with the order insert.
      for (const item of items) {
        const res = await client.query(
          `UPDATE products
           SET stock_quantity = stock_quantity - $1, updated_at = now()
           WHERE id = $2 AND stock_quantity >= $1`,
          [item.quantity, item.id]
        );
        if ((res.rowCount ?? 0) === 0) {
          throw new InsufficientStockError({ productId: item.id, requested: item.quantity, available: 0 });
        }
      }

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function listOrders(scope: OrderScope): Promise<OrderDto[]> {
    return orderRepo.listOrders(scope);
  }

async function getOrder(orderNumber: string, scope: OrderScope): Promise<OrderDto | null> {
     return orderRepo.getOrderByNumber(orderNumber, scope);
   }
   
   /**
    * Updates the status of an order with validation.
    * 
    * @param orderNumber - The order number to update
    * @param status - The new status to set
    * @param scope - The scope for ownership validation (optional for admin operations)
    */
   async function updateOrderStatus(
     orderNumber: string, 
     status: OrderStatus,
     scope?: OrderScope
   ): Promise<OrderDto> {
     const client = await pool.connect();
     try {
       await client.query('BEGIN');
       
       // Get the current order
       const currentOrder = await orderRepo.getOrderByNumber(orderNumber, scope ?? null);
       if (!currentOrder) {
         throw new NotFoundError(`Order ${orderNumber} not found`);
       }
       
       // Validate the transition (admin operations may omit the scope)
       if (!isValidOrderTransition(currentOrder.status, status)) {
         throw new ConflictError(`Invalid order status transition from ${currentOrder.status} to ${status}`);
       }
       
       // Update the order status
       await orderRepo.updateOrderStatus(client, orderNumber, status);
       
       // Get the updated order
       const updatedOrder = await orderRepo.getOrderByNumber(orderNumber, scope ?? null);
       if (!updatedOrder) {
         throw new NotFoundError(`Failed to retrieve updated order ${orderNumber}`);
       }
       
       await client.query('COMMIT');
       return updatedOrder;
     } catch (err) {
       await client.query('ROLLBACK');
       throw err;
     } finally {
       client.release();
     }
   }
 
   return { createOrder, listOrders, getOrder, updateOrderStatus };
}

export type OrderService = ReturnType<typeof createOrderService>;

/** Normalizes a validated safe payment payload; never accepts card secrets. */
function toSafePayment(payment: CreateOrderInput['payment']): OrderPaymentDto {
  switch (payment.method) {
    case 'card':
      return { method: 'card', last4: payment.last4 };
    case 'upi':
      return { method: 'upi', upiId: payment.upiId };
    case 'cod':
      return { method: 'cod' };
  }
}

export { roundMoney };
