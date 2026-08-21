import type { DbPool } from '../db/pool.js';
import type { SessionUser } from '../types.js';

export function createSessionRepository(pool: DbPool) {
  async function createSession(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  /**
   * Resolves a valid, non-revoked, non-expired session from its token hash.
   * Touches last_seen_at so the session can be audited.
   */
  async function findValidSession(tokenHash: string, now = new Date()): Promise<SessionUser | null> {
    const res = await pool.query<{ id: number; user_id: number }>(
      `UPDATE sessions
       SET last_seen_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > $2
       RETURNING id, user_id`,
      [tokenHash, now]
    );
    const row = res.rows[0];
    return row ? { sessionId: row.id, userId: row.user_id } : null;
  }

  /** Revokes a single session (logout). */
  async function revokeSession(sessionId: number): Promise<void> {
    await pool.query(`UPDATE sessions SET revoked_at = now() WHERE id = $1`, [sessionId]);
  }

  /**
   * Revokes every active session for a user (logout-all / password change).
   * `excludeSessionId` keeps the current session alive (e.g. password change).
   */
  async function revokeAllForUser(userId: number, excludeSessionId?: number): Promise<void> {
    await pool.query(
      `UPDATE sessions SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL AND id <> COALESCE($2, -1)`,
      [userId, excludeSessionId ?? -1]
    );
  }

  return { createSession, findValidSession, revokeSession, revokeAllForUser };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
