import type { DbPool } from '../db/pool.js';

export function createPasswordResetRepository(pool: DbPool) {
  async function create(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  /**
   * Consumes a reset token (single use). Returns the user id on success,
   * null when unknown/expired/already used.
   */
  async function consume(tokenHash: string, now = new Date()): Promise<number | null> {
    const res = await pool.query<{ user_id: number }>(
      `UPDATE password_resets
       SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
       RETURNING user_id`,
      [tokenHash, now]
    );
    return res.rows[0]?.user_id ?? null;
  }

  return { create, consume };
}

export type PasswordResetRepository = ReturnType<typeof createPasswordResetRepository>;
