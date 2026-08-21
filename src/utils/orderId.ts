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
 * Generates an order ID like `TBX-20260815-8F4K2M`.
 * Collision checks against existing orders happen in the order service.
 */
export function generateOrderId(now: Date = new Date()): string {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return `${ID_PREFIX}-${ymd}-${randomSegment(ID_RANDOM_LENGTH)}`;
}
