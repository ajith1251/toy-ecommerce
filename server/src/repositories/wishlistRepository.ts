import type { DbPool } from '../db/pool.js';

/**
 * Wishlist storage keyed by `owner_key` (same model as carts). Authenticated
 * users get `user:<userId>`; guests get `client:<clientId>`.
 */
export function createWishlistRepository(pool: DbPool) {
  async function getWishlist(ownerKey: string): Promise<number[]> {
    const res = await pool.query<{ product_id: number }>(
      `SELECT wi.product_id
       FROM wishlist_items wi
       JOIN products p ON p.id = wi.product_id AND p.is_active = true
       WHERE wi.owner_key = $1
       ORDER BY wi.created_at`,
      [ownerKey]
    );
    return res.rows.map(r => r.product_id);
  }

  async function addItem(ownerKey: string, productId: number): Promise<void> {
    await pool.query(`INSERT INTO wishlists (owner_key) VALUES ($1) ON CONFLICT (owner_key) DO NOTHING`, [ownerKey]);
    await pool.query(
      `INSERT INTO wishlist_items (owner_key, product_id) VALUES ($1, $2)
       ON CONFLICT (owner_key, product_id) DO NOTHING`,
      [ownerKey, productId]
    );
  }

  async function removeItem(ownerKey: string, productId: number): Promise<void> {
    await pool.query(`DELETE FROM wishlist_items WHERE owner_key = $1 AND product_id = $2`, [ownerKey, productId]);
  }

  /** Unions a guest wishlist into an account wishlist, then retires the guest list. */
  async function mergeIntoAccount(accountOwnerKey: string, userId: number, guestOwnerKey: string): Promise<void> {
    const res = await pool.query<{ product_id: number }>(
      `SELECT product_id FROM wishlist_items WHERE owner_key = $1`,
      [guestOwnerKey]
    );
    await pool.query(`INSERT INTO wishlists (owner_key, user_id) VALUES ($1, $2) ON CONFLICT (owner_key) DO NOTHING`, [
      accountOwnerKey,
      userId,
    ]);
    for (const row of res.rows) {
      await pool.query(
        `INSERT INTO wishlist_items (owner_key, product_id) VALUES ($1, $2)
         ON CONFLICT (owner_key, product_id) DO NOTHING`,
        [accountOwnerKey, row.product_id]
      );
    }
    await pool.query(`DELETE FROM wishlists WHERE owner_key = $1`, [guestOwnerKey]);
  }

  return { getWishlist, addItem, removeItem, mergeIntoAccount };
}

export type WishlistRepository = ReturnType<typeof createWishlistRepository>;
