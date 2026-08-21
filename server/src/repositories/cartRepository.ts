import type { DbPool } from '../db/pool.js';

export interface CartItemRow {
  product_id: number;
  quantity: number;
}

/**
 * Cart storage keyed by `owner_key` — `client:<clientId>` for guests,
 * `user:<userId>` for authenticated customers. Ownership is always resolved
 * server-side (session or header), never from the request body.
 */
export function createCartRepository(pool: DbPool) {
  async function getCart(ownerKey: string): Promise<CartItemRow[]> {
    const res = await pool.query<CartItemRow>(
      `SELECT ci.product_id, ci.quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id AND p.is_active = true
       WHERE ci.owner_key = $1
       ORDER BY ci.created_at`,
      [ownerKey]
    );
    return res.rows;
  }

  async function upsertItem(ownerKey: string, productId: number, quantity: number): Promise<void> {
    await pool.query(`INSERT INTO carts (owner_key) VALUES ($1) ON CONFLICT (owner_key) DO NOTHING`, [ownerKey]);
    await pool.query(
      `INSERT INTO cart_items (owner_key, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (owner_key, product_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()`,
      [ownerKey, productId, quantity]
    );
  }

  /** Merges a guest cart into an account cart, capping at stock. Returns capped lines. */
  async function mergeIntoAccount(
    accountOwnerKey: string,
    userId: number,
    guestOwnerKey: string,
    stockById: Map<number, number>
  ): Promise<{ productId: number; requested: number; capped: number }[]> {
    const res = await pool.query<{ product_id: number; quantity: number }>(
      `SELECT product_id, quantity FROM cart_items WHERE owner_key = $1`,
      [guestOwnerKey]
    );
    const capped: { productId: number; requested: number; capped: number }[] = [];
    await pool.query(`INSERT INTO carts (owner_key, user_id) VALUES ($1, $2) ON CONFLICT (owner_key) DO NOTHING`, [
      accountOwnerKey,
      userId,
    ]);
    for (const row of res.rows) {
      const stock = stockById.get(row.product_id) ?? 0;
      const requested = row.quantity;
      const cappedQty = Math.min(requested, Math.max(0, stock));
      if (cappedQty > 0) {
        await pool.query(
          `INSERT INTO cart_items (owner_key, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (owner_key, product_id)
           DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()`,
          [accountOwnerKey, row.product_id, cappedQty]
        );
      }
      if (cappedQty < requested) capped.push({ productId: row.product_id, requested, capped: cappedQty });
    }
    // The guest cart is retired once merged.
    await pool.query(`DELETE FROM carts WHERE owner_key = $1`, [guestOwnerKey]);
    return capped;
  }

  async function removeItem(ownerKey: string, productId: number): Promise<void> {
    await pool.query(`DELETE FROM cart_items WHERE owner_key = $1 AND product_id = $2`, [ownerKey, productId]);
  }

  async function clearCart(ownerKey: string): Promise<void> {
    await pool.query(`DELETE FROM cart_items WHERE owner_key = $1`, [ownerKey]);
  }

  return { getCart, upsertItem, mergeIntoAccount, removeItem, clearCart };
}

export type CartRepository = ReturnType<typeof createCartRepository>;
