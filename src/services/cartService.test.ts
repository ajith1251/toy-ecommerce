import { beforeEach, describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY } from '../constants/storage';
import { makeToy } from '../test/fixtures';
import {
  addCartItem,
  calcCartSubtotal,
  countCartItems,
  loadCart,
  removeCartItem,
  saveCart,
  updateCartQuantity,
} from './cartService';

const toy1 = makeToy({ id: 1, name: 'Toy One', price: 10 });
const toy2 = makeToy({ id: 2, name: 'Toy Two', price: 5 });

describe('cartService — pure operations', () => {
  it('adds a new item with quantity 1', () => {
    const items = addCartItem([], toy1);
    expect(items).toEqual([{ ...toy1, quantity: 1 }]);
  });

  it('increments the quantity of an existing item', () => {
    const once = addCartItem([], toy1);
    const twice = addCartItem(once, toy1);
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(2);
  });

  it('removes an item by id', () => {
    const items = addCartItem(addCartItem([], toy1), toy2);
    expect(removeCartItem(items, 1).map(i => i.id)).toEqual([2]);
  });

  it('removes an item when the quantity drops to zero', () => {
    const items = addCartItem([], toy1);
    expect(updateCartQuantity(items, 1, 0)).toEqual([]);
    expect(updateCartQuantity(items, 1, -3)).toEqual([]);
  });

  it('updates the quantity of an item', () => {
    const items = addCartItem([], toy1);
    expect(updateCartQuantity(items, 1, 4)[0].quantity).toBe(4);
  });

  it('counts total units and computes the subtotal', () => {
    const items = updateCartQuantity(addCartItem(addCartItem([], toy1), toy2), 1, 2);
    expect(countCartItems(items)).toBe(3);
    expect(calcCartSubtotal(items)).toBe(25);
  });
});

describe('cartService — persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips the cart through localStorage', () => {
    const items = updateCartQuantity(addCartItem([], toy1), 1, 2);
    saveCart(items);
    expect(loadCart()).toEqual(items);
  });

  it('returns an empty cart for missing data', () => {
    expect(loadCart()).toEqual([]);
  });

  it('returns an empty cart for malformed JSON', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{oops');
    expect(loadCart()).toEqual([]);
  });

  it('drops malformed entries but keeps valid ones', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { id: 1, price: 10, quantity: 1 },
        { id: 'x', price: 5, quantity: 1 },
        { id: 3, price: 5, quantity: 0 },
        'garbage',
      ])
    );
    const items = loadCart();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(1);
  });
});
