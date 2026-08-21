import type { Response } from 'express';
import type { AddCartItemInput, UpdateCartItemInput } from '../schemas/cart.js';
import type { CartService } from '../services/cartService.js';
import type { Owner } from '../services/ownership.js';

export function createCartController(carts: CartService) {
  async function getCart(owner: Owner, res: Response) {
    res.json({ data: await carts.getCart(owner) });
  }

  async function addItem(body: AddCartItemInput, owner: Owner, res: Response) {
    const cart = await carts.addItem(owner, body.productId, body.quantity);
    res.status(201).json({ data: cart });
  }

  async function updateItem(body: UpdateCartItemInput, owner: Owner, productId: number, res: Response) {
    const cart = await carts.updateItem(owner, productId, body.quantity);
    res.json({ data: cart });
  }

  async function removeItem(owner: Owner, productId: number, res: Response) {
    const cart = await carts.removeItem(owner, productId);
    res.json({ data: cart });
  }

  async function clearCart(owner: Owner, res: Response) {
    await carts.clearCart(owner);
    res.json({ data: [] });
  }

  return { getCart, addItem, updateItem, removeItem, clearCart };
}
