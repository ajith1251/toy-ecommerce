import type pg from 'pg';
import type { DbPool } from '../db/pool.js';
import type { PaymentStatus } from '../types.js';

/** Anything that can run parameterized queries (pool or a transaction client). */
type Queryable = DbPool | pg.PoolClient;

interface PaymentRow {
  id: bigint;
  order_id: bigint;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  method: string;
  // 'card', 'upi', 'cod'
  amount: number; // in minor units (paise)
  currency: string;
  status: PaymentStatus;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
  captured_at: string | null;
}

export interface NewPaymentRecord {
  orderId: bigint; // references orders.id
  providerOrderId: string;
  providerPaymentId: string | null;
  method: string; // 'card', 'upi', 'cod'
  amount: number; // in minor units (paise)
  currency: string;
  status: PaymentStatus;
}

export interface PaymentUpdate {
  providerPaymentId?: string | null;
  status?: PaymentStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  capturedAt?: string | null; // ISO timestamp string
}

export function createPaymentRepository(pool: DbPool) {
  /** Creates a new payment record. */
  async function createPayment(q: Queryable, record: NewPaymentRecord): Promise<{ id: bigint }> {
    const res = await q.query(
      `INSERT INTO payments (
        order_id, provider, provider_order_id, provider_payment_id, method, amount, currency, status
      ) VALUES (
        $1, 'razorpay', $2, $3, $4, $5, $6, $7
      ) RETURNING id`,
      [
        record.orderId,
        record.providerOrderId,
        record.providerPaymentId ?? null,
        record.method,
        record.amount,
        record.currency,
        record.status,
      ]
    );
    return { id: BigInt(res.rows[0].id) };
  }

  /** Gets a payment by its internal ID. */
  async function getPaymentById(q: Queryable, paymentId: bigint): Promise<PaymentRow | null> {
    const res = await q.query(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId]
    );
    return res.rows[0] ?? null;
  }

  /** Gets a payment by order ID. */
  async function getPaymentByOrderId(q: Queryable, orderId: bigint): Promise<PaymentRow | null> {
    const res = await q.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [orderId]
    );
    return res.rows[0] ?? null;
  }

  /** Gets a payment by provider order ID. */
  async function getPaymentByProviderOrderId(q: Queryable, providerOrderId: string): Promise<PaymentRow | null> {
    const res = await q.query(
      `SELECT * FROM payments WHERE provider_order_id = $1`,
      [providerOrderId]
    );
    return res.rows[0] ?? null;
  }

  /** Updates a payment record. */
  async function updatePayment(
    q: Queryable,
    paymentId: bigint,
    update: PaymentUpdate
  ): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (update.providerPaymentId !== undefined) {
      updates.push(`provider_payment_id = $${paramIndex++}`);
      values.push(update.providerPaymentId);
    }

    if (update.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(update.status);
    }

    if (update.failureCode !== undefined) {
      updates.push(`failure_code = $${paramIndex++}`);
      values.push(update.failureCode ?? null);
    }

    if (update.failureMessage !== undefined) {
      updates.push(`failure_message = $${paramIndex++}`);
      values.push(update.failureMessage ?? null);
    }

    if (update.capturedAt !== undefined) {
      updates.push(`captured_at = $${paramIndex++}`);
      values.push(update.capturedAt ?? null);
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(paymentId);

    await q.query(
      `UPDATE payments SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  /** Updates payment status and provider payment ID. */
  async function updatePaymentAndStatus(
    q: Queryable,
    paymentId: bigint,
    providerPaymentId: string | null,
    status: PaymentStatus
  ): Promise<void> {
    await updatePayment(q, paymentId, {
      providerPaymentId,
      status,
      capturedAt: status === 'captured' ? new Date().toISOString() : undefined
    });
  }

  /** Updates payment status and failure information. */
  async function updatePaymentStatusAndFailure(
    q: Queryable,
    paymentId: bigint,
    status: PaymentStatus,
    failureCode: string | null,
    failureMessage: string | null
  ): Promise<void> {
    await updatePayment(q, paymentId, {
      status,
      failureCode,
      failureMessage
    });
  }

  return {
    createPayment,
    getPaymentById,
    getPaymentByOrderId,
    getPaymentByProviderOrderId,
    updatePayment,
    updatePaymentAndStatus,
    updatePaymentStatusAndFailure,
  };
}

export type PaymentRepository = ReturnType<typeof createPaymentRepository>;