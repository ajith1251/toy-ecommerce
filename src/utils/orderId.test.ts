import { describe, expect, it } from 'vitest';
import { generateOrderId } from './orderId';

describe('generateOrderId', () => {
  it('matches the TBX-YYYYMMDD-XXXXXX format', () => {
    const id = generateOrderId(new Date(2026, 7, 15));
    expect(id).toMatch(/^TBX-\d{8}-[A-Z0-9]{6}$/);
    expect(id).toMatch(/^TBX-20260815-/);
  });

  it('generates unique ids in bulk', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => generateOrderId()));
    expect(ids.size).toBe(2000);
  });
});
