const ID_PREFIX = 'TBX';
const ID_RANDOM_LENGTH = 6;
const RANDOM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  return out;
}

/**
 * Generates a server-side order number like `TBX-20260817-8F4K2M`.
 * Uniqueness is guaranteed by the database UNIQUE constraint plus a retry
 * loop in the order service (see createOrder).
 */
export function generateOrderNumber(now: Date = new Date()): string {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return `${ID_PREFIX}-${ymd}-${randomSegment(ID_RANDOM_LENGTH)}`;
}

/** True when a value looks like a server order number (TBX-YYYYMMDD-XXXXXX). */
export function isOrderNumber(value: string): boolean {
  return /^TBX-\d{8}-[0-9A-Z]{6}$/.test(value);
}
