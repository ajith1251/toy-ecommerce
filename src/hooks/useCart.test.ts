import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { makeToy } from '../test/fixtures';
import { useCart } from './useCart';

const CART_KEY = 'toybox-cart';

describe('useCart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('adds items and increments quantities of existing items', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(makeToy({ id: 1, price: 10 })));
    act(() => result.current.addItem(makeToy({ id: 1, price: 10 })));
    act(() => result.current.addItem(makeToy({ id: 2, price: 5 })));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.find(i => i.id === 1)?.quantity).toBe(2);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(25);
  });

  it('computes the subtotal from quantity and price', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(makeToy({ id: 1, price: 12.5 })));
    act(() => result.current.addItem(makeToy({ id: 1, price: 12.5 })));
    expect(result.current.totalPrice).toBeCloseTo(25);
  });

  it('removes items', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(makeToy({ id: 1, price: 10 })));
    act(() => result.current.addItem(makeToy({ id: 2, price: 5 })));
    act(() => result.current.removeItem(1));
    expect(result.current.items.map(i => i.id)).toEqual([2]);
  });

  it('removes the item when quantity drops to zero or below', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(makeToy({ id: 1, price: 10 })));
    act(() => result.current.updateQuantity(1, 0));
    expect(result.current.items).toEqual([]);
  });

  it('clears the whole cart', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(makeToy({ id: 1, price: 10 })));
    act(() => result.current.addItem(makeToy({ id: 2, price: 5 })));
    act(() => result.current.clearCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.totalPrice).toBe(0);
  });

  it('handles malformed localStorage JSON', () => {
    localStorage.setItem(CART_KEY, '{bad json');
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
  });

  it('filters invalid entries from persisted carts', () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { id: 1, price: 10, quantity: 1 },
        { id: 'x', price: 5, quantity: 1 },
        { id: 3, price: 5, quantity: 0 },
        'garbage',
      ])
    );
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(1);
  });
});
