import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Password hashing — Argon2id (memory-hard, resistant to GPU cracking).
 * Only the hash is ever stored; plaintext passwords never touch the DB or
 * logs.
 */
export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, {
    algorithm: 2, // Argon2id
    memoryCost: 19_456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password);
  } catch {
    return false; // malformed hash — treat as invalid, never throw
  }
}

/** Opaque random token (48 hex chars = 24 bytes of entropy). */
export function generateToken(): string {
  return randomBytes(24).toString('hex');
}

/** SHA-256 of a token — what actually gets stored (leak-safe, revocable). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
