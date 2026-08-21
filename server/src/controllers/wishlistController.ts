import type { Response } from 'express';
import type { WishlistService } from '../services/wishlistService.js';
import type { Owner } from '../services/ownership.js';

export function createWishlistController(wishlists: WishlistService) {
  async function getWishlist(owner: Owner, res: Response) {
    res.json({ data: await wishlists.getWishlist(owner) });
  }

  async function addItem(owner: Owner, productId: number, res: Response) {
    const wishlist = await wishlists.addItem(owner, productId);
    res.status(201).json({ data: wishlist });
  }

  async function removeItem(owner: Owner, productId: number, res: Response) {
    const wishlist = await wishlists.removeItem(owner, productId);
    res.json({ data: wishlist });
  }

  return { getWishlist, addItem, removeItem };
}
